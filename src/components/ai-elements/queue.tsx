/**
 * Queue 组件（SolidJS 版本）
 * 用于显示队列/待办列表
 */

import { type Component, type JSX, splitProps, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, Paperclip } from "lucide-solid";

export type QueueMessagePart = {
  type: string;
  text?: string;
  url?: string;
  filename?: string;
  mediaType?: string;
};

export type QueueMessage = {
  id: string;
  parts: QueueMessagePart[];
};

export type QueueTodo = {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
};

export type QueueItemProps = JSX.LiHTMLAttributes<HTMLLIElement>;

export const QueueItem: Component<QueueItemProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <li
      class={cn(
        "group flex flex-col gap-1 rounded-md px-3 py-1 text-sm transition-colors hover:bg-muted",
        props.class
      )}
      {...rest}
    />
  );
};

export type QueueItemIndicatorProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  completed?: boolean;
};

export const QueueItemIndicator: Component<QueueItemIndicatorProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "completed"]);
  
  return (
    <span
      class={cn(
        "mt-0.5 inline-block size-2.5 rounded-full border",
        props.completed
          ? "border-muted-foreground/20 bg-muted-foreground/10"
          : "border-muted-foreground/50",
        props.class
      )}
      {...rest}
    />
  );
};

export type QueueItemContentProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  completed?: boolean;
};

export const QueueItemContent: Component<QueueItemContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "completed"]);
  
  return (
    <span
      class={cn(
        "line-clamp-1 grow break-words",
        props.completed
          ? "text-muted-foreground/50 line-through"
          : "text-muted-foreground",
        props.class
      )}
      {...rest}
    />
  );
};

export type QueueItemDescriptionProps = JSX.HTMLAttributes<HTMLDivElement> & {
  completed?: boolean;
};

export const QueueItemDescription: Component<QueueItemDescriptionProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "completed"]);
  
  return (
    <div
      class={cn(
        "ml-6 text-xs",
        props.completed
          ? "text-muted-foreground/40 line-through"
          : "text-muted-foreground",
        props.class
      )}
      {...rest}
    />
  );
};

export type QueueItemActionsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const QueueItemActions: Component<QueueItemActionsProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div class={cn("flex gap-1", props.class)} {...rest} />
  );
};

export type QueueItemActionProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "variant" | "size">;

export const QueueItemAction: Component<QueueItemActionProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <Button
      class={cn(
        "size-auto rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted-foreground/10 hover:text-foreground group-hover:opacity-100",
        props.class
      )}
      size="icon"
      type="button"
      variant="ghost"
      {...rest}
    />
  );
};

export type QueueItemAttachmentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const QueueItemAttachment: Component<QueueItemAttachmentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div class={cn("mt-1 flex flex-wrap gap-2", props.class)} {...rest} />
  );
};

export type QueueItemImageProps = JSX.ImgHTMLAttributes<HTMLImageElement>;

export const QueueItemImage: Component<QueueItemImageProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <img
      alt=""
      class={cn("h-8 w-8 rounded border object-cover", props.class)}
      height={32}
      width={32}
      {...rest}
    />
  );
};

export type QueueItemFileProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const QueueItemFile: Component<QueueItemFileProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <span
      class={cn(
        "flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs",
        props.class
      )}
      {...rest}
    >
      <Paperclip size={12} />
      <span class="max-w-[100px] truncate">{props.children}</span>
    </span>
  );
};

export type QueueListProps = JSX.HTMLAttributes<HTMLDivElement>;

export const QueueList: Component<QueueListProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div class={cn("-mb-1 mt-2 max-h-40 overflow-y-auto pr-4", props.class)} {...rest}>
      <ul>{props.children}</ul>
    </div>
  );
};

export type QueueSectionProps = JSX.HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const QueueSection: Component<QueueSectionProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "defaultOpen", "open", "onOpenChange"]);
  
  return (
    <Collapsible
      class={cn(props.class)}
      defaultOpen={props.defaultOpen ?? true}
      open={props.open}
      onOpenChange={props.onOpenChange}
      {...rest}
    />
  );
};

export type QueueSectionTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const QueueSectionTrigger: Component<QueueSectionTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <CollapsibleTrigger asChild>
      <button
        class={cn(
          "group flex w-full items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-left font-medium text-muted-foreground text-sm transition-colors hover:bg-muted",
          props.class
        )}
        type="button"
        {...rest}
      >
        {props.children}
      </button>
    </CollapsibleTrigger>
  );
};

export type QueueSectionLabelProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  count?: number;
  label: string;
  icon?: JSX.Element;
};

export const QueueSectionLabel: Component<QueueSectionLabelProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "count", "label", "icon"]);
  
  return (
    <span class={cn("flex items-center gap-2", props.class)} {...rest}>
      <ChevronDown class="group-data-[state=closed]:-rotate-90 size-4 transition-transform" />
      <Show when={props.icon}>{props.icon}</Show>
      <span>
        {props.count} {props.label}
      </span>
    </span>
  );
};

export type QueueSectionContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const QueueSectionContent: Component<QueueSectionContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CollapsibleContent class={cn(props.class)} {...rest} />
  );
};

export type QueueProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Queue: Component<QueueProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      class={cn(
        "flex flex-col gap-2 rounded-xl border border-border bg-background px-3 pt-2 pb-2 shadow-xs",
        props.class
      )}
      {...rest}
    />
  );
};

