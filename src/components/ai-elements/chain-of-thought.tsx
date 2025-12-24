/**
 * ChainOfThought 组件（SolidJS 版本）
 * 用于显示思维链过程
 */

import { type Component, type JSX, type Accessor, createContext, useContext, createSignal, createMemo, splitProps, Show } from "solid-js";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  Brain,
  ChevronDown,
  Dot,
  type LucideIcon,
} from "lucide-solid";

type ChainOfThoughtContextValue = {
  isOpen: Accessor<boolean>;
  setIsOpen: (open: boolean) => void;
};

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(null);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    );
  }
  return context;
};

export type ChainOfThoughtProps = JSX.HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought: Component<ChainOfThoughtProps> = (props) => {
  const [isOpen, setIsOpen] = createSignal(props.open ?? props.defaultOpen ?? false);
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    props.onOpenChange?.(open);
  };

  const chainOfThoughtContext = createMemo(() => ({
    isOpen,
    setIsOpen: handleOpenChange,
  }));

  const [, rest] = splitProps(props, [
    "class",
    "open",
    "defaultOpen",
    "onOpenChange",
    "children",
  ]);

  return (
    <ChainOfThoughtContext.Provider value={chainOfThoughtContext()}>
      <div
        class={cn("not-prose max-w-prose space-y-4", props.class)}
        {...rest}
      >
        {props.children}
      </div>
    </ChainOfThoughtContext.Provider>
  );
};

export type ChainOfThoughtHeaderProps = JSX.HTMLAttributes<HTMLButtonElement>;

export const ChainOfThoughtHeader: Component<ChainOfThoughtHeaderProps> = (props) => {
  const { isOpen, setIsOpen } = useChainOfThought();
  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <Collapsible onOpenChange={setIsOpen} open={isOpen()}>
      <CollapsibleTrigger
        class={cn(
          "flex w-full items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
          props.class
        )}
        {...rest}
      >
        <Brain size={16} />
        <span class="flex-1 text-left">
          {props.children ?? "Chain of Thought"}
        </span>
        <ChevronDown
          size={16}
          class={cn(
            "transition-transform",
            isOpen() ? "rotate-180" : "rotate-0"
          )}
        />
      </CollapsibleTrigger>
    </Collapsible>
  );
};

export type ChainOfThoughtStepProps = JSX.HTMLAttributes<HTMLDivElement> & {
  icon?: Component<{ size?: number; class?: string }>;
  label: JSX.Element;
  description?: JSX.Element;
  status?: "complete" | "active" | "pending";
};

export const ChainOfThoughtStep: Component<ChainOfThoughtStepProps> = (props) => {
  const statusStyles = {
    complete: "text-muted-foreground",
    active: "text-foreground",
    pending: "text-muted-foreground/50",
  };

  const Icon = props.icon ?? Dot;
  const [, rest] = splitProps(props, [
    "class",
    "icon",
    "label",
    "description",
    "status",
    "children",
  ]);

  return (
    <div
      class={cn(
        "flex gap-2 text-sm",
        statusStyles[props.status ?? "complete"],
        "fade-in-0 slide-in-from-top-2 animate-in",
        props.class
      )}
      {...rest}
    >
      <div class="relative mt-0.5">
        <Icon size={16} />
        <div class="-mx-px absolute top-7 bottom-0 left-1/2 w-px bg-border" />
      </div>
      <div class="flex-1 space-y-2 overflow-hidden">
        <div>{props.label}</div>
        <Show when={props.description}>
          <div class="text-muted-foreground text-xs">{props.description}</div>
        </Show>
        {props.children}
      </div>
    </div>
  );
};

export type ChainOfThoughtSearchResultsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ChainOfThoughtSearchResults: Component<ChainOfThoughtSearchResultsProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn("flex flex-wrap items-center gap-2", props.class)}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type ChainOfThoughtSearchResultProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const ChainOfThoughtSearchResult: Component<ChainOfThoughtSearchResultProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <Badge
      class={cn("gap-1 px-2 py-0.5 font-normal text-xs", props.class)}
      variant="secondary"
      {...rest}
    >
      {props.children}
    </Badge>
  );
};

export type ChainOfThoughtContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ChainOfThoughtContent: Component<ChainOfThoughtContentProps> = (props) => {
  const { isOpen } = useChainOfThought();
  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <Collapsible open={isOpen()}>
      <CollapsibleContent
        class={cn(
          "mt-2 space-y-3",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
          props.class
        )}
        {...rest}
      >
        {props.children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export type ChainOfThoughtImageProps = JSX.HTMLAttributes<HTMLDivElement> & {
  caption?: string;
};

export const ChainOfThoughtImage: Component<ChainOfThoughtImageProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "caption"]);
  
  return (
    <div class={cn("mt-2 space-y-2", props.class)} {...rest}>
      <div class="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {props.children}
      </div>
      <Show when={props.caption}>
        <p class="text-muted-foreground text-xs">{props.caption}</p>
      </Show>
    </div>
  );
};

