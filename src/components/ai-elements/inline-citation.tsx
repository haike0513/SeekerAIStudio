/**
 * InlineCitation 组件（SolidJS 版本）
 * 用于显示内联引用
 */

import { type Component, type JSX, createContext, useContext, createSignal, onMount, onCleanup, splitProps } from "solid-js";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselOptionsProps,
} from "@/components/ui/carousel";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-solid";

export type InlineCitationProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const InlineCitation: Component<InlineCitationProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <span
      class={cn("group inline items-center gap-1", props.class)}
      {...rest}
    />
  );
};

export type InlineCitationTextProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const InlineCitationText: Component<InlineCitationTextProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <span
      class={cn("transition-colors group-hover:bg-accent", props.class)}
      {...rest}
    />
  );
};

export type InlineCitationCardProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCard: Component<InlineCitationCardProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <HoverCard closeDelay={0} openDelay={0} {...rest}>
      {props.children}
    </HoverCard>
  );
};

export type InlineCitationCardTriggerProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  sources: string[];
};

export const InlineCitationCardTrigger: Component<InlineCitationCardTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "sources"]);
  
  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "unknown";
    }
  };

  return (
    <HoverCardTrigger asChild>
      <Badge
        class={cn("ml-1 rounded-full", props.class)}
        variant="secondary"
        {...rest}
      >
        {props.sources[0] ? (
          <>
            {getHostname(props.sources[0])}{" "}
            {props.sources.length > 1 && `+${props.sources.length - 1}`}
          </>
        ) : (
          "unknown"
        )}
      </Badge>
    </HoverCardTrigger>
  );
};

export type InlineCitationCardBodyProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCardBody: Component<InlineCitationCardBodyProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <HoverCardContent class={cn("relative w-80 p-0", props.class)} {...rest} />
  );
};

type CarouselApi = {
  scrollPrev: () => void;
  scrollNext: () => void;
  selectedScrollSnap: () => number;
  scrollSnapList: () => number[];
  on: (event: string, callback: () => void) => void;
  off: (event: string, callback: () => void) => void;
};

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined);

const useCarouselApi = () => {
  const context = useContext(CarouselApiContext);
  return context;
};

export type InlineCitationCarouselProps = JSX.HTMLAttributes<HTMLDivElement> & CarouselOptionsProps;

export const InlineCitationCarousel: Component<InlineCitationCarouselProps> = (props) => {
  const [api, setApi] = createSignal<CarouselApi | undefined>(undefined);
  const [, rest] = splitProps(props, ["class", "children", "setAPI"]);

  const handleSetApi = (apiInstance: any) => {
    setApi(apiInstance);
    props.setAPI?.(apiInstance);
  };

  return (
    <CarouselApiContext.Provider value={api()}>
      <Carousel class={cn("w-full", props.class)} setAPI={handleSetApi} {...rest}>
        {props.children}
      </Carousel>
    </CarouselApiContext.Provider>
  );
};

export type InlineCitationCarouselContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCarouselContent: Component<InlineCitationCarouselContentProps> = (props) => {
  return <CarouselContent {...props} />;
};

export type InlineCitationCarouselItemProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCarouselItem: Component<InlineCitationCarouselItemProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CarouselItem
      class={cn("w-full space-y-2 p-4 pl-8", props.class)}
      {...rest}
    />
  );
};

export type InlineCitationCarouselHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCarouselHeader: Component<InlineCitationCarouselHeaderProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      class={cn(
        "flex items-center justify-between gap-2 rounded-t-md bg-secondary p-2",
        props.class
      )}
      {...rest}
    />
  );
};

export type InlineCitationCarouselIndexProps = JSX.HTMLAttributes<HTMLDivElement>;

export const InlineCitationCarouselIndex: Component<InlineCitationCarouselIndexProps> = (props) => {
  const api = useCarouselApi();
  const [current, setCurrent] = createSignal(0);
  const [count, setCount] = createSignal(0);
  const [, rest] = splitProps(props, ["class", "children"]);

  onMount(() => {
    if (!api) return;
    
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  });

  return (
    <div
      class={cn(
        "flex flex-1 items-center justify-end px-3 py-1 text-muted-foreground text-xs",
        props.class
      )}
      {...rest}
    >
      {props.children ?? `${current()}/${count()}`}
    </div>
  );
};

export type InlineCitationCarouselPrevProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const InlineCitationCarouselPrev: Component<InlineCitationCarouselPrevProps> = (props) => {
  const api = useCarouselApi();
  const [, rest] = splitProps(props, ["class"]);

  const handleClick = () => {
    api?.scrollPrev();
  };

  return (
    <button
      aria-label="Previous"
      class={cn("shrink-0", props.class)}
      onClick={handleClick}
      type="button"
      {...rest}
    >
      <ArrowLeft size={16} class="text-muted-foreground" />
    </button>
  );
};

export type InlineCitationCarouselNextProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const InlineCitationCarouselNext: Component<InlineCitationCarouselNextProps> = (props) => {
  const api = useCarouselApi();
  const [, rest] = splitProps(props, ["class"]);

  const handleClick = () => {
    api?.scrollNext();
  };

  return (
    <button
      aria-label="Next"
      class={cn("shrink-0", props.class)}
      onClick={handleClick}
      type="button"
      {...rest}
    >
      <ArrowRight size={16} class="text-muted-foreground" />
    </button>
  );
};

export type InlineCitationSourceProps = JSX.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  url?: string;
  description?: string;
};

export const InlineCitationSource: Component<InlineCitationSourceProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "title", "url", "description", "children"]);
  
  return (
    <div class={cn("space-y-1", props.class)} {...rest}>
      <Show when={props.title}>
        <h4 class="truncate font-medium text-sm leading-tight">{props.title}</h4>
      </Show>
      <Show when={props.url}>
        <p class="truncate break-all text-muted-foreground text-xs">{props.url}</p>
      </Show>
      <Show when={props.description}>
        <p class="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
          {props.description}
        </p>
      </Show>
      {props.children}
    </div>
  );
};

export type InlineCitationQuoteProps = JSX.BlockquoteHTMLAttributes<HTMLQuoteElement>;

export const InlineCitationQuote: Component<InlineCitationQuoteProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <blockquote
      class={cn(
        "border-muted border-l-2 pl-3 text-muted-foreground text-sm italic",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </blockquote>
  );
};

