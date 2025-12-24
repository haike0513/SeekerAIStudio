/**
 * Task 组件（SolidJS 版本）
 * 用于显示任务列表
 */

import { type Component, type JSX, splitProps } from "solid-js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, Search } from "lucide-solid";

export type TaskItemFileProps = JSX.HTMLAttributes<HTMLDivElement>;

export const TaskItemFile: Component<TaskItemFileProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn(
        "inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground text-xs",
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type TaskItemProps = JSX.HTMLAttributes<HTMLDivElement>;

export const TaskItem: Component<TaskItemProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div class={cn("text-muted-foreground text-sm", props.class)} {...rest}>
      {props.children}
    </div>
  );
};

export type TaskProps = JSX.HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const Task: Component<TaskProps> = (props) => {
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

export type TaskTriggerProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  title: string;
};

export const TaskTrigger: Component<TaskTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "title"]);
  
  return (
    <CollapsibleTrigger asChild class={cn("group", props.class)} {...rest}>
      {props.children ?? (
        <div class="flex w-full cursor-pointer items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground">
          <Search size={16} />
          <p class="text-sm">{props.title}</p>
          <ChevronDown size={16} class="transition-transform group-data-[state=open]:rotate-180" />
        </div>
      )}
    </CollapsibleTrigger>
  );
};

export type TaskContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const TaskContent: Component<TaskContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <CollapsibleContent
      class={cn(
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        props.class
      )}
      {...rest}
    >
      <div class="mt-4 space-y-2 border-muted border-l-2 pl-4">
        {props.children}
      </div>
    </CollapsibleContent>
  );
};

