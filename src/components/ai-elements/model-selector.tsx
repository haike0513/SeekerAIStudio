/**
 * ModelSelector 组件（SolidJS 版本）
 * 用于选择模型
 */

import { type Component, type JSX, splitProps, Show } from "solid-js";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ModelSelectorProps = JSX.HTMLAttributes<HTMLDivElement> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ModelSelector: Component<ModelSelectorProps> = (props) => {
  return <Dialog {...props} />;
};

export type ModelSelectorTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ModelSelectorTrigger: Component<ModelSelectorTriggerProps> = (props) => {
  return <DialogTrigger {...props} />;
};

export type ModelSelectorContentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  title?: JSX.Element;
};

export const ModelSelectorContent: Component<ModelSelectorContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "title"]);
  
  return (
    <DialogContent class={cn("p-0", props.class)} {...rest}>
      <Show when={props.title}>
        <DialogTitle class="sr-only">{props.title}</DialogTitle>
      </Show>
      <Command class="**:data-[slot=command-input-wrapper]:h-auto">
        {props.children}
      </Command>
    </DialogContent>
  );
};

export type ModelSelectorDialogProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorDialog: Component<ModelSelectorDialogProps> = (props) => {
  return <CommandDialog {...props} />;
};

export type ModelSelectorInputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const ModelSelectorInput: Component<ModelSelectorInputProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CommandInput class={cn("h-auto py-3.5", props.class)} {...rest} />
  );
};

export type ModelSelectorListProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorList: Component<ModelSelectorListProps> = (props) => {
  return <CommandList {...props} />;
};

export type ModelSelectorEmptyProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorEmpty: Component<ModelSelectorEmptyProps> = (props) => {
  return <CommandEmpty {...props} />;
};

export type ModelSelectorGroupProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorGroup: Component<ModelSelectorGroupProps> = (props) => {
  return <CommandGroup {...props} />;
};

export type ModelSelectorItemProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorItem: Component<ModelSelectorItemProps> = (props) => {
  return <CommandItem {...props} />;
};

export type ModelSelectorShortcutProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const ModelSelectorShortcut: Component<ModelSelectorShortcutProps> = (props) => {
  return <CommandShortcut {...props} />;
};

export type ModelSelectorSeparatorProps = JSX.HTMLAttributes<HTMLHRElement>;

export const ModelSelectorSeparator: Component<ModelSelectorSeparatorProps> = (props) => {
  return <CommandSeparator {...props} />;
};

export type ModelSelectorLogoProps = Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  provider: string;
};

export const ModelSelectorLogo: Component<ModelSelectorLogoProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "provider"]);
  
  return (
    <img
      {...rest}
      alt={`${props.provider} logo`}
      class={cn("size-3 dark:invert", props.class)}
      height={12}
      src={`https://models.dev/logos/${props.provider}.svg`}
      width={12}
    />
  );
};

export type ModelSelectorLogoGroupProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ModelSelectorLogoGroup: Component<ModelSelectorLogoGroupProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      class={cn(
        "-space-x-1 flex shrink-0 items-center [&>img]:rounded-full [&>img]:bg-background [&>img]:p-px [&>img]:ring-1 dark:[&>img]:bg-foreground",
        props.class
      )}
      {...rest}
    />
  );
};

export type ModelSelectorNameProps = JSX.HTMLAttributes<HTMLSpanElement>;

export const ModelSelectorName: Component<ModelSelectorNameProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <span class={cn("flex-1 truncate text-left", props.class)} {...rest} />
  );
};

