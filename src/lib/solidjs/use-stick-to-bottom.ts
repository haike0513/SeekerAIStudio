/**
 * use-stick-to-bottom SolidJS 版本
 * 基于 https://github.com/stackblitz-labs/use-stick-to-bottom
 */

import {
	createSignal,
	onCleanup,
	type Accessor,
} from "solid-js";

export interface SpringAnimation {
	/**
	 * A value from 0 to 1, on how much to damp the animation.
	 * 0 means no damping, 1 means full damping.
	 *
	 * @default 0.7
	 */
	damping?: number;

	/**
	 * The stiffness of how fast/slow the animation gets up to speed.
	 *
	 * @default 0.05
	 */
	stiffness?: number;

	/**
	 * The inertial mass associated with the animation.
	 * Higher numbers make the animation slower.
	 *
	 * @default 1.25
	 */
	mass?: number;
}

const DEFAULT_SPRING_ANIMATION = {
	damping: 0.7,
	stiffness: 0.05,
	mass: 1.25,
} as const;

export type Animation = ScrollBehavior | SpringAnimation;

export interface ScrollElements {
	scrollElement: HTMLElement;
	contentElement: HTMLElement;
}

export type GetTargetScrollTop = (
	targetScrollTop: number,
	context: ScrollElements,
) => number;

export interface StickToBottomOptions extends SpringAnimation {
	resize?: Animation;
	initial?: Animation | boolean;
	targetScrollTop?: GetTargetScrollTop;
}

export type ScrollToBottomOptions =
	| ScrollBehavior
	| {
			animation?: Animation;

			/**
			 * Whether to wait for any existing scrolls to finish before
			 * performing this one. Or if a millisecond is passed,
			 * it will wait for that duration before performing the scroll.
			 *
			 * @default false
			 */
			wait?: boolean | number;

			/**
			 * Whether to prevent the user from escaping the scroll,
			 * by scrolling up with their mouse.
			 */
			ignoreEscapes?: boolean;

			/**
			 * Only scroll to the bottom if we're already at the bottom.
			 *
			 * @default false
			 */
			preserveScrollPosition?: boolean;

			/**
			 * The extra duration in ms that this scroll event should persist for.
			 * (in addition to the time that it takes to get to the bottom)
			 *
			 * Not to be confused with the duration of the animation -
			 * for that you should adjust the animation option.
			 *
			 * @default 0
			 */
			duration?: number | Promise<void>;
	  };

export type ScrollToBottom = (
	scrollOptions?: ScrollToBottomOptions,
) => Promise<boolean> | boolean;
export type StopScroll = () => void;

const STICK_TO_BOTTOM_OFFSET_PX = 70;
const SIXTY_FPS_INTERVAL_MS = 1000 / 60;
const RETAIN_ANIMATION_DURATION_MS = 350;

let mouseDown = false;

if (typeof document !== "undefined") {
	document.addEventListener("mousedown", () => {
		mouseDown = true;
	});

	document.addEventListener("mouseup", () => {
		mouseDown = false;
	});

	document.addEventListener("click", () => {
		mouseDown = false;
	});
}

interface StickToBottomState {
	scrollTop: number;
	lastScrollTop?: number;
	ignoreScrollToTop?: number;
	targetScrollTop: number;
	calculatedTargetScrollTop: number;
	scrollDifference: number;
	resizeDifference: number;

	animation?: {
		behavior: "instant" | Required<SpringAnimation>;
		ignoreEscapes: boolean;
		promise: Promise<boolean>;
	};
	lastTick?: number;
	velocity: number;
	accumulated: number;

	escapedFromLock: boolean;
	isAtBottom: boolean;
	isNearBottom: boolean;

	resizeObserver?: ResizeObserver;
}

export interface StickToBottomInstance {
	contentRef: (ref: HTMLElement | null) => void;
	scrollRef: (ref: HTMLElement | null) => void;
	scrollToBottom: ScrollToBottom;
	stopScroll: StopScroll;
	isAtBottom: Accessor<boolean>;
	isNearBottom: Accessor<boolean>;
	escapedFromLock: Accessor<boolean>;
	state: StickToBottomState;
}

const animationCache = new Map<string, Readonly<Required<SpringAnimation>>>();

function mergeAnimations(...animations: (Animation | boolean | undefined)[]) {
	const result = { ...DEFAULT_SPRING_ANIMATION };
	let instant = false;

	for (const animation of animations) {
		if (animation === "instant") {
			instant = true;
			continue;
		}

		if (typeof animation !== "object") {
			continue;
		}

		instant = false;

		result.damping = animation.damping ?? result.damping;
		result.stiffness = animation.stiffness ?? result.stiffness;
		result.mass = animation.mass ?? result.mass;
	}

	const key = JSON.stringify(result);

	if (!animationCache.has(key)) {
		animationCache.set(key, Object.freeze(result));
	}

	return instant ? "instant" : animationCache.get(key)!;
}

export const useStickToBottom = (
	options: StickToBottomOptions = {},
): StickToBottomInstance => {
	const [escapedFromLock, setEscapedFromLock] = createSignal(false);
	const [isAtBottom, setIsAtBottom] = createSignal(
		options.initial !== false,
	);
	const [isNearBottom, setIsNearBottom] = createSignal(false);

	let scrollElement: HTMLElement | null = null;
	let contentElement: HTMLElement | null = null;
	let optionsRef = options;

	const isSelecting = (): boolean => {
		if (!mouseDown) {
			return false;
		}

		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) {
			return false;
		}

		const range = selection.getRangeAt(0);
		return (
			scrollElement?.contains(range.commonAncestorContainer as Node) ||
			range.commonAncestorContainer.contains(scrollElement as Node)
		);
	};

	let lastCalculation:
		| { targetScrollTop: number; calculatedScrollTop: number }
		| undefined;

	const state: StickToBottomState = {
		escapedFromLock: false,
		isAtBottom: options.initial !== false,
		resizeDifference: 0,
		accumulated: 0,
		velocity: 0,

		get scrollTop() {
			return scrollElement?.scrollTop ?? 0;
		},
		set scrollTop(scrollTop: number) {
			if (scrollElement) {
				scrollElement.scrollTop = scrollTop;
				state.ignoreScrollToTop = scrollElement.scrollTop;
			}
		},

		get targetScrollTop() {
			if (!scrollElement || !contentElement) {
				return 0;
			}

			return (
				scrollElement.scrollHeight - 1 - scrollElement.clientHeight
			);
		},
		get calculatedTargetScrollTop() {
			if (!scrollElement || !contentElement) {
				return 0;
			}

			const { targetScrollTop } = state;

			if (!optionsRef.targetScrollTop) {
				return targetScrollTop;
			}

			if (lastCalculation?.targetScrollTop === targetScrollTop) {
				return lastCalculation.calculatedScrollTop;
			}

			const calculatedScrollTop = Math.max(
				Math.min(
					optionsRef.targetScrollTop(targetScrollTop, {
						scrollElement,
						contentElement,
					}),
					targetScrollTop,
				),
				0,
			);

			lastCalculation = { targetScrollTop, calculatedScrollTop };

			requestAnimationFrame(() => {
				lastCalculation = undefined;
			});

			return calculatedScrollTop;
		},

		get scrollDifference() {
			return state.calculatedTargetScrollTop - state.scrollTop;
		},

		get isNearBottom() {
			return state.scrollDifference <= STICK_TO_BOTTOM_OFFSET_PX;
		},
	};

	const scrollToBottom = (
		scrollOptions: ScrollToBottomOptions = {},
	): Promise<boolean> | boolean => {
		if (typeof scrollOptions === "string") {
			scrollOptions = { animation: scrollOptions };
		}

		if (!scrollOptions.preserveScrollPosition) {
			state.isAtBottom = true;
			setIsAtBottom(true);
		}

		const waitElapsed = Date.now() + (Number(scrollOptions.wait) || 0);
		const behavior = mergeAnimations(
			optionsRef,
			scrollOptions.animation,
		);
		const { ignoreEscapes = false } = scrollOptions;

		let durationElapsed: number;
		let startTarget = state.calculatedTargetScrollTop;

		if (scrollOptions.duration instanceof Promise) {
			scrollOptions.duration.finally(() => {
				durationElapsed = Date.now();
			});
		} else {
			durationElapsed = waitElapsed + (scrollOptions.duration ?? 0);
		}

		const next = async (): Promise<boolean> => {
			const promise = new Promise<boolean>((resolve) => {
				requestAnimationFrame(() => {
					if (!state.isAtBottom) {
						state.animation = undefined;
						resolve(false);
						return;
					}

					const { scrollTop } = state;
					const tick = performance.now();
					const tickDelta =
						(tick - (state.lastTick ?? tick)) / SIXTY_FPS_INTERVAL_MS;
					
					if (!state.animation) {
						state.animation = { behavior, promise, ignoreEscapes };
					}

					if (state.animation.behavior === behavior) {
						state.lastTick = tick;
					}

					if (isSelecting()) {
						resolve(next());
						return;
					}

					if (waitElapsed > Date.now()) {
						resolve(next());
						return;
					}

					if (
						scrollTop < Math.min(startTarget, state.calculatedTargetScrollTop)
					) {
						if (state.animation?.behavior === behavior) {
							if (behavior === "instant") {
								state.scrollTop = state.calculatedTargetScrollTop;
								resolve(next());
								return;
							}

							state.velocity =
								(behavior.damping * state.velocity +
									behavior.stiffness * state.scrollDifference) /
								behavior.mass;
							state.accumulated += state.velocity * tickDelta;
							state.scrollTop += state.accumulated;

							if (state.scrollTop !== scrollTop) {
								state.accumulated = 0;
							}
						}

						resolve(next());
						return;
					}

					if (durationElapsed > Date.now()) {
						startTarget = state.calculatedTargetScrollTop;

						resolve(next());
						return;
					}

					state.animation = undefined;

					/**
					 * If we're still below the target, then queue
					 * up another scroll to the bottom with the last
					 * requested animatino.
					 */
					if (state.scrollTop < state.calculatedTargetScrollTop) {
						resolve(
							scrollToBottom({
								animation: mergeAnimations(
									optionsRef,
									optionsRef.resize,
								),
								ignoreEscapes,
								duration:
									Math.max(0, durationElapsed - Date.now()) || undefined,
							}) as Promise<boolean>,
						);
						return;
					}

					resolve(state.isAtBottom);
				});
			});

			return promise.then((isAtBottom) => {
				requestAnimationFrame(() => {
					if (!state.animation) {
						state.lastTick = undefined;
						state.velocity = 0;
					}
				});

				return isAtBottom;
			});
		};

		if (scrollOptions.wait !== true) {
			state.animation = undefined;
		}

		if (state.animation?.behavior === behavior) {
			return state.animation.promise;
		}

		return next();
	};

	const stopScroll = (): void => {
		state.escapedFromLock = true;
		state.isAtBottom = false;
		setEscapedFromLock(true);
		setIsAtBottom(false);
	};

	const handleScroll = (event: Event) => {
		if (event.target !== scrollElement) {
			return;
		}

		const { scrollTop, ignoreScrollToTop } = state;
		let { lastScrollTop = scrollTop } = state;

		state.lastScrollTop = scrollTop;
		state.ignoreScrollToTop = undefined;

		if (ignoreScrollToTop && ignoreScrollToTop > scrollTop) {
			lastScrollTop = ignoreScrollToTop;
		}

		setIsNearBottom(state.isNearBottom);

		setTimeout(() => {
			if (state.resizeDifference || scrollTop === ignoreScrollToTop) {
				return;
			}

			if (isSelecting()) {
				state.escapedFromLock = true;
				state.isAtBottom = false;
				setEscapedFromLock(true);
				setIsAtBottom(false);
				return;
			}

			const isScrollingDown = scrollTop > lastScrollTop;
			const isScrollingUp = scrollTop < lastScrollTop;

			if (state.animation?.ignoreEscapes) {
				state.scrollTop = lastScrollTop;
				return;
			}

			if (isScrollingUp) {
				state.escapedFromLock = true;
				state.isAtBottom = false;
				setEscapedFromLock(true);
				setIsAtBottom(false);
			}

			if (isScrollingDown) {
				state.escapedFromLock = false;
				setEscapedFromLock(false);
			}

			if (!state.escapedFromLock && state.isNearBottom) {
				state.isAtBottom = true;
				setIsAtBottom(true);
			}
		}, 1);
	};

	const handleWheel = (event: WheelEvent) => {
		let element = event.target as HTMLElement;

		while (
			!["scroll", "auto"].includes(getComputedStyle(element).overflow)
		) {
			if (!element.parentElement) {
				return;
			}

			element = element.parentElement;
		}

		if (
			element === scrollElement &&
			event.deltaY < 0 &&
			scrollElement &&
			scrollElement.scrollHeight > scrollElement.clientHeight &&
			!state.animation?.ignoreEscapes
		) {
			state.escapedFromLock = true;
			state.isAtBottom = false;
			setEscapedFromLock(true);
			setIsAtBottom(false);
		}
	};

	const scrollRef = (ref: HTMLElement | null) => {
		if (scrollElement) {
			scrollElement.removeEventListener("scroll", handleScroll);
			scrollElement.removeEventListener("wheel", handleWheel);
		}
		scrollElement = ref;
		if (ref) {
			// 确保滚动容器有正确的 overflow 样式
			if (getComputedStyle(ref).overflow === "visible") {
				ref.style.overflow = "auto";
			}
			ref.addEventListener("scroll", handleScroll, { passive: true });
			ref.addEventListener("wheel", handleWheel, { passive: true });
		}
	};

	const contentRef = (ref: HTMLElement | null) => {
		state.resizeObserver?.disconnect();

		if (!ref) {
			contentElement = null;
			return;
		}

		contentElement = ref;

		let previousHeight: number | undefined;

		state.resizeObserver = new ResizeObserver(([entry]) => {
			const { height } = entry.contentRect;
			const difference = height - (previousHeight ?? height);

			state.resizeDifference = difference;

			if (state.scrollTop > state.targetScrollTop) {
				state.scrollTop = state.targetScrollTop;
			}

			setIsNearBottom(state.isNearBottom);

			if (difference >= 0) {
				const animation = mergeAnimations(
					optionsRef,
					previousHeight ? optionsRef.resize : optionsRef.initial,
				);

				scrollToBottom({
					animation,
					wait: true,
					preserveScrollPosition: true,
					duration:
						animation === "instant"
							? undefined
							: RETAIN_ANIMATION_DURATION_MS,
				});
			} else {
				if (state.isNearBottom) {
					state.escapedFromLock = false;
					state.isAtBottom = true;
					setEscapedFromLock(false);
					setIsAtBottom(true);
				}
			}

			previousHeight = height;

			requestAnimationFrame(() => {
				setTimeout(() => {
					if (state.resizeDifference === difference) {
						state.resizeDifference = 0;
					}
				}, 1);
			});
		});

		state.resizeObserver?.observe(ref);
	};

	onCleanup(() => {
		if (scrollElement) {
			scrollElement.removeEventListener("scroll", handleScroll);
			scrollElement.removeEventListener("wheel", handleWheel);
		}
		state.resizeObserver?.disconnect();
	});

	return {
		contentRef,
		scrollRef,
		scrollToBottom,
		stopScroll,
		isAtBottom: () => isAtBottom() || isNearBottom(),
		isNearBottom,
		escapedFromLock,
		state,
	};
};

