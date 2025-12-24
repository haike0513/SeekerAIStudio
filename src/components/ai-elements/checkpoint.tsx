/**
 * Checkpoint 组件（SolidJS 版本）
 * 用于显示检查点
 */

import { type Component, type JSX, splitProps, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-solid";

export type CheckpointProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Checkpoint: Component<CheckpointProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn("flex items-center gap-0.5 text-muted-foreground overflow-hidden", props.class)}
      {...rest}
    >
      {props.children}
      <Separator />
    </div>
  );
};

export type CheckpointIconProps = JSX.HTMLAttributes<SVGSVGElement>;

export const CheckpointIcon: Component<CheckpointIconProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <Show
      when={props.children}
      fallback={<Bookmark class={cn("size-4 shrink-0", props.class)} {...rest} />}
    >
      {props.children}
    </Show>
  );
};

export type CheckpointTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string;
};

export const CheckpointTrigger: Component<CheckpointTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "variant", "size", "tooltip"]);
  
  const button = (
    <Button
      size={props.size ?? "sm"}
      type="button"
      variant={props.variant ?? "ghost"}
      {...rest}
    >
      {props.children}
    </Button>
  );

  if (props.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent align="start" side="bottom">
          {props.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

