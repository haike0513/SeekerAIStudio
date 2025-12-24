/**
 * Artifact 组件（SolidJS 版本）
 * 用于显示工件/产物
 */

import { type Component, type JSX, splitProps, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { X } from "lucide-solid";

export type ArtifactProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Artifact: Component<ArtifactProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      class={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
        props.class
      )}
      {...rest}
    />
  );
};

export type ArtifactHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ArtifactHeader: Component<ArtifactHeaderProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      class={cn(
        "flex items-center justify-between border-b bg-muted/50 px-4 py-3",
        props.class
      )}
      {...rest}
    />
  );
};

export type ArtifactCloseProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ArtifactClose: Component<ArtifactCloseProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "size", "variant"]);
  
  return (
    <Button
      class={cn(
        "size-8 p-0 text-muted-foreground hover:text-foreground",
        props.class
      )}
      size={props.size ?? "sm"}
      type="button"
      variant={props.variant ?? "ghost"}
      {...rest}
    >
      {props.children ?? <X size={16} />}
      <span class="sr-only">Close</span>
    </Button>
  );
};

export type ArtifactTitleProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export const ArtifactTitle: Component<ArtifactTitleProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <p
      class={cn("font-medium text-foreground text-sm", props.class)}
      {...rest}
    />
  );
};

export type ArtifactDescriptionProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export const ArtifactDescription: Component<ArtifactDescriptionProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <p class={cn("text-muted-foreground text-sm", props.class)} {...rest} />
  );
};

export type ArtifactActionsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ArtifactActions: Component<ArtifactActionsProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div class={cn("flex items-center gap-1", props.class)} {...rest} />
  );
};

export type ArtifactActionProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string;
  label?: string;
  icon?: Component<{ size?: number; class?: string }>;
};

export const ArtifactAction: Component<ArtifactActionProps> = (props) => {
  const Icon = props.icon;
  const [, rest] = splitProps(props, ["class", "tooltip", "label", "icon", "children"]);
  
  const button = (
    <Button type="button" {...rest}>
      {Icon && <Icon size={16} />}
      {props.children}
      <Show when={props.label || props.tooltip}>
        <span class="sr-only">{props.label || props.tooltip}</span>
      </Show>
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

