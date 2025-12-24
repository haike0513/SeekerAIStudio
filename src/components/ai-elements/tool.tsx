/**
 * Tool 组件（SolidJS 版本）
 * 用于显示工具调用及其状态
 */

import { type Component, type JSX, Show, splitProps } from "solid-js";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  type CollapsibleProps,
  type CollapsibleContentProps,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";
import {
  CheckCircle,
  ChevronDown,
  Circle,
  Clock,
  Wrench,
  XCircle,
} from "lucide-solid";
import { CodeBlock } from "./code-block";

export type ToolProps = CollapsibleProps;

export const Tool: Component<ToolProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <Collapsible
      class={cn("not-prose mb-4 w-full rounded-md border", props.class)}
      {...rest}
    />
  );
};

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ToolUIPart["state"];
  class?: string;
};

const getStatusBadge = (status: ToolUIPart["state"]) => {
  const labels: Record<ToolUIPart["state"], string> = {
    "input-streaming": "Pending",
    "input-available": "Running",
    // @ts-expect-error state only available in AI SDK v6
    "approval-requested": "Awaiting Approval",
    "approval-responded": "Responded",
    "output-available": "Completed",
    "output-error": "Error",
    "output-denied": "Denied",
  };

  const icons: Record<ToolUIPart["state"], JSX.Element> = {
    "input-streaming": <Circle size={16} />,
    "input-available": <Clock size={16} class="animate-pulse" />,
    // @ts-expect-error state only available in AI SDK v6
    "approval-requested": <Clock size={16} class="text-yellow-600" />,
    "approval-responded": <CheckCircle size={16} class="text-blue-600" />,
    "output-available": <CheckCircle size={16} class="text-green-600" />,
    "output-error": <XCircle size={16} class="text-red-600" />,
    "output-denied": <XCircle size={16} class="text-orange-600" />,
  };

  return (
    <Badge class="gap-1.5 rounded-full text-xs" variant="secondary">
      {icons[status]}
      {labels[status]}
    </Badge>
  );
};

export const ToolHeader: Component<ToolHeaderProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "title", "type", "state"]);
  
  return (
    <CollapsibleTrigger
      class={cn(
        "flex w-full items-center justify-between gap-4 p-3",
        props.class
      )}
      {...rest}
    >
      <div class="flex items-center gap-2">
        <Wrench size={16} class="text-muted-foreground" />
        <span class="font-medium text-sm">
          {props.title ?? props.type.split("-").slice(1).join("-")}
        </span>
        {getStatusBadge(props.state)}
      </div>
      <ChevronDown size={16} class="text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = CollapsibleContentProps;

export const ToolContent: Component<ToolContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CollapsibleContent
      class={cn(
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        props.class
      )}
      {...rest}
    />
  );
};

export type ToolInputProps = JSX.HTMLAttributes<HTMLDivElement> & {
  input: ToolUIPart["input"];
};

export const ToolInput: Component<ToolInputProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "input"]);
  
  return (
    <div class={cn("space-y-2 overflow-hidden p-4", props.class)} {...rest}>
      <h4 class="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Parameters
      </h4>
      <div class="rounded-md bg-muted/50">
        <CodeBlock code={JSON.stringify(props.input, null, 2)} language="json" />
      </div>
    </div>
  );
};

export type ToolOutputProps = JSX.HTMLAttributes<HTMLDivElement> & {
  output: ToolUIPart["output"];
  errorText: ToolUIPart["errorText"];
};

export const ToolOutput: Component<ToolOutputProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "output", "errorText"]);
  
  if (!(props.output || props.errorText)) {
    return null;
  }

  let Output: JSX.Element = <div>{props.output as string}</div>;

  if (typeof props.output === "object" && props.output !== null) {
    // 检查是否是有效的 JSX 元素
    if (typeof props.output === "object" && "type" in props.output) {
      Output = props.output as JSX.Element;
    } else {
      Output = (
        <CodeBlock code={JSON.stringify(props.output, null, 2)} language="json" />
      );
    }
  } else if (typeof props.output === "string") {
    Output = <CodeBlock code={props.output} language="json" />;
  }

  return (
    <div class={cn("space-y-2 p-4", props.class)} {...rest}>
      <h4 class="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {props.errorText ? "Error" : "Result"}
      </h4>
      <div
        class={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          props.errorText
            ? "bg-destructive/10 text-destructive"
            : "bg-muted/50 text-foreground"
        )}
      >
        <Show when={props.errorText}>
          <div>{props.errorText}</div>
        </Show>
        {Output}
      </div>
    </div>
  );
};

