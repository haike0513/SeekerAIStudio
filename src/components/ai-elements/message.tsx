/**
 * Message 组件（SolidJS 版本）
 * 基于 Vercel AI Elements React 版本转换
 */

import { type Component, type JSX, createContext, useContext, createSignal, onCleanup, Show, For, splitProps, type Accessor } from "solid-js";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonText } from "@/components/ui/button-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FileUIPart, UIMessage } from "ai";
import { ChevronLeft, ChevronRight, Paperclip, X } from "lucide-solid";

export type MessageProps = JSX.HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message: Component<MessageProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "from"]);
  
  return (
    <div
      class={cn(
        "group flex w-full max-w-[95%] flex-col gap-2",
        props.from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
        props.class
      )}
      {...rest}
    />
  );
};

export type MessageContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageContent: Component<MessageContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn(
        "is-user:dark flex w-fit max-w-full min-w-0 flex-col gap-2 overflow-hidden text-sm",
        "group-[.is-user]:ml-auto group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-foreground",
        "group-[.is-assistant]:text-foreground",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type MessageActionsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageActions: Component<MessageActionsProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div class={cn("flex items-center gap-1", props.class)} {...rest}>
      {props.children}
    </div>
  );
};

export type MessageActionProps = Component<JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string;
  label?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}>;

export const MessageAction: MessageActionProps = (props) => {
  const [, rest] = splitProps(props, ["tooltip", "label", "variant", "size", "children"]);
  
  const button = (
    <Button 
      size={props.size || "icon"} 
      type="button" 
      variant={props.variant || "ghost"} 
      {...rest}
    >
      {props.children}
      <span class="sr-only">{props.label || props.tooltip}</span>
    </Button>
  );

  if (props.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{props.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

// MessageBranch Context
type MessageBranchContextType = {
  currentBranch: Accessor<number>;
  totalBranches: Accessor<number>;
  goToPrevious: () => void;
  goToNext: () => void;
};

const MessageBranchContext = createContext<MessageBranchContextType | null>(null);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);
  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }
  return context;
};

export type MessageBranchProps = JSX.HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch: Component<MessageBranchProps> = (props) => {
  const [currentBranch, setCurrentBranch] = createSignal(props.defaultBranch || 0);
  const [branches, setBranches] = createSignal<JSX.Element[]>([]);
  
  const handleBranchChange = (newBranch: number) => {
    setCurrentBranch(newBranch);
    props.onBranchChange?.(newBranch);
  };

  const goToPrevious = () => {
    const total = branches().length;
    const newBranch = currentBranch() > 0 ? currentBranch() - 1 : total - 1;
    handleBranchChange(newBranch);
  };

  const goToNext = () => {
    const total = branches().length;
    const newBranch = currentBranch() < total - 1 ? currentBranch() + 1 : 0;
    handleBranchChange(newBranch);
  };

  const contextValue: MessageBranchContextType = {
    currentBranch,
    totalBranches: () => branches().length,
    goToPrevious,
    goToNext,
  };

  const [, rest] = splitProps(props, ["class", "defaultBranch", "onBranchChange", "children"]);

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        class={cn("grid w-full gap-2 [&>div]:pb-0", props.class)}
        {...rest}
      >
        {props.children}
      </div>
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent: Component<MessageBranchContentProps> = (props) => {
  const { currentBranch } = useMessageBranch();
  const childrenArray = Array.isArray(props.children) ? props.children : [props.children];

  const [, rest] = splitProps(props, ["children"]);

  return (
    <For each={childrenArray}>
      {(branch, index) => (
        <div
          class={cn(
            "grid gap-2 overflow-hidden [&>div]:pb-0",
            index() === currentBranch() ? "block" : "hidden"
          )}
          {...rest}
        >
          {branch}
        </div>
      )}
    </For>
  );
};

export type MessageBranchSelectorProps = JSX.HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const MessageBranchSelector: Component<MessageBranchSelectorProps> = (props) => {
  const { totalBranches } = useMessageBranch();
  const [, rest] = splitProps(props, ["class", "from", "children"]);

  return (
    <Show when={totalBranches() > 1}>
      <ButtonGroup
        class="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md"
        orientation="horizontal"
        {...rest}
      >
        {props.children}
      </ButtonGroup>
    </Show>
  );
};

export type MessageBranchPreviousProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const MessageBranchPrevious: Component<MessageBranchPreviousProps> = (props) => {
  const { goToPrevious, totalBranches } = useMessageBranch();
  const [, rest] = splitProps(props, ["children"]);

  return (
    <Button
      aria-label="Previous branch"
      disabled={totalBranches() <= 1}
      onClick={goToPrevious}
      size="icon"
      type="button"
      variant="ghost"
      {...rest}
    >
      {props.children ?? <ChevronLeft size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const MessageBranchNext: Component<MessageBranchNextProps> = (props) => {
  const { goToNext, totalBranches } = useMessageBranch();
  const [, rest] = splitProps(props, ["children", "class"]);

  return (
    <Button
      aria-label="Next branch"
      disabled={totalBranches() <= 1}
      onClick={goToNext}
      size="icon"
      type="button"
      variant="ghost"
      {...rest}
    >
      {props.children ?? <ChevronRight size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage: Component<MessageBranchPageProps> = (props) => {
  const { currentBranch, totalBranches } = useMessageBranch();
  const [, rest] = splitProps(props, ["class"]);

  return (
    <ButtonText
      class={cn(
        "border-none bg-transparent text-muted-foreground shadow-none",
        props.class
      )}
      {...rest}
    >
      {currentBranch() + 1} of {totalBranches()}
    </ButtonText>
  );
};

export type MessageResponseProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageResponse: Component<MessageResponseProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type MessageAttachmentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart;
  onRemove?: () => void;
};

export const MessageAttachment: Component<MessageAttachmentProps> = (props) => {
  const filename = props.data.filename || "";
  const mediaType =
    props.data.mediaType?.startsWith("image/") && props.data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

  const [, rest] = splitProps(props, ["class", "data", "onRemove"]);

  return (
    <div
      class={cn(
        "group relative size-24 overflow-hidden rounded-lg",
        props.class
      )}
      {...rest}
    >
      <Show
        when={isImage}
        fallback={
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <div class="flex size-full shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Paperclip size={16} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{attachmentLabel}</p>
              </TooltipContent>
            </Tooltip>
            <Show when={props.onRemove}>
              <Button
                aria-label="Remove attachment"
                class="size-6 shrink-0 rounded-full p-0 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 [&>svg]:size-3"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onRemove?.();
                }}
                type="button"
                variant="ghost"
              >
                <X size={12} />
                <span class="sr-only">Remove</span>
              </Button>
            </Show>
          </>
        }
      >
        <>
          <img
            alt={filename || "attachment"}
            class="size-full object-cover"
            height={100}
            src={props.data.url}
            width={100}
          />
          <Show when={props.onRemove}>
            <Button
              aria-label="Remove attachment"
              class="absolute top-2 right-2 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100 [&>svg]:size-3"
              onClick={(e) => {
                e.stopPropagation();
                props.onRemove?.();
              }}
              type="button"
              variant="ghost"
            >
              <X size={12} />
              <span class="sr-only">Remove</span>
            </Button>
          </Show>
        </>
      </Show>
    </div>
  );
};

export type MessageAttachmentsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageAttachments: Component<MessageAttachmentsProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <Show when={props.children}>
      <div
        class={cn(
          "ml-auto flex w-fit flex-wrap items-start gap-2",
          props.class
        )}
        {...rest}
      >
        {props.children}
      </div>
    </Show>
  );
};

export type MessageToolbarProps = JSX.HTMLAttributes<HTMLDivElement>;

export const MessageToolbar: Component<MessageToolbarProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn(
        "mt-4 flex w-full items-center justify-between gap-4",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

