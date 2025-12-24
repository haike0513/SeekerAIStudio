/**
 * Reasoning 组件（SolidJS 版本）
 * 用于显示 AI 的推理过程
 */

import { type Component, type JSX, type Accessor, createContext, useContext, createSignal, createEffect, onMount, onCleanup, Show, splitProps } from "solid-js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Brain, ChevronDown } from "lucide-solid";
import { Shimmer } from "./shimmer";

type ReasoningContextValue = {
  isStreaming: Accessor<boolean>;
  isOpen: Accessor<boolean>;
  setIsOpen: (open: boolean) => void;
  duration: Accessor<number | undefined>;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

export const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};

export type ReasoningProps = JSX.HTMLAttributes<HTMLDivElement> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;
const MS_IN_S = 1000;

export const Reasoning: Component<ReasoningProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(props.open ?? props.defaultOpen ?? true);
  const [duration, setDuration] = createSignal<number | undefined>(props.duration);
  const [hasAutoClosed, setHasAutoClosed] = createSignal(false);
  const [startTime, setStartTime] = createSignal<number | null>(null);
  
  const isStreaming = () => props.isStreaming ?? false;

  // Track duration when streaming starts and ends
  createEffect(() => {
    if (isStreaming() && startTime() === null) {
      setStartTime(Date.now());
    } else if (!isStreaming() && startTime() !== null) {
      setDuration(Math.ceil((Date.now() - startTime()!) / MS_IN_S));
      setStartTime(null);
    }
  });

  // Auto-open when streaming starts, auto-close when streaming ends (once only)
  createEffect(() => {
    if (props.defaultOpen && !isStreaming() && isOpen() && !hasAutoClosed()) {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setHasAutoClosed(true);
      }, AUTO_CLOSE_DELAY);

      onCleanup(() => clearTimeout(timer));
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    props.onOpenChange?.(newOpen);
  };

  const [, rest] = splitProps(props, [
    "class",
    "isStreaming",
    "open",
    "defaultOpen",
    "onOpenChange",
    "duration",
    "children",
  ]);

  return (
    <ReasoningContext.Provider
      value={{
        isStreaming,
        isOpen,
        setIsOpen: handleOpenChange,
        duration,
      }}
    >
      <Collapsible
        class={cn("not-prose mb-4", props.class)}
        onOpenChange={handleOpenChange}
        open={isOpen()}
        {...rest}
      >
        {props.children}
      </Collapsible>
    </ReasoningContext.Provider>
  );
};

export type ReasoningTriggerProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  getThinkingMessage?: (isStreaming: boolean, duration?: number) => JSX.Element;
};

const defaultGetThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming || duration === 0) {
    return <Shimmer duration={1}>Thinking...</Shimmer>;
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

export const ReasoningTrigger: Component<ReasoningTriggerProps> = (props) => {
  const { isStreaming, isOpen, duration } = useReasoning();
  const [, rest] = splitProps(props, ["class", "children", "getThinkingMessage"]);

  return (
    <CollapsibleTrigger
      class={cn(
        "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <>
          <Brain size={16} />
          {props.getThinkingMessage?.(isStreaming(), duration()) ?? 
           defaultGetThinkingMessage(isStreaming(), duration())}
          <ChevronDown
            size={16}
            class={cn(
              "transition-transform",
              isOpen() ? "rotate-180" : "rotate-0"
            )}
          />
        </>
      )}
    </CollapsibleTrigger>
  );
};

export type ReasoningContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  children: string;
};

export const ReasoningContent: Component<ReasoningContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <CollapsibleContent
      class={cn(
        "mt-4 text-sm",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        props.class
      )}
      {...rest}
    >
      <div class="whitespace-pre-wrap">{props.children}</div>
    </CollapsibleContent>
  );
};

