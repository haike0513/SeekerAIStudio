/**
 * Node 组件（SolidJS 版本）
 * 用于显示节点（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的 Handle 组件
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX, splitProps, Show } from "solid-js";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type NodeProps = JSX.HTMLAttributes<HTMLDivElement> & {
  handles: {
    target: boolean;
    source: boolean;
  };
};

export const Node: Component<NodeProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "handles", "children"]);
  
  return (
    <Card
      class={cn(
        "node-container relative size-full h-auto w-sm gap-0 rounded-md p-0",
        props.class
      )}
      {...rest}
    >
      <Show when={props.handles.target}>
        {/* Handle 组件需要 ReactFlow，这里用占位符 */}
        <div class="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-ring bg-background" />
      </Show>
      <Show when={props.handles.source}>
        <div class="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 size-3 rounded-full border-2 border-ring bg-background" />
      </Show>
      {props.children}
    </Card>
  );
};

export type NodeHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export const NodeHeader: Component<NodeHeaderProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CardHeader
      class={cn("gap-0.5 rounded-t-md border-b bg-secondary p-3!", props.class)}
      {...rest}
    />
  );
};

export type NodeTitleProps = JSX.HTMLAttributes<HTMLHeadingElement>;

export const NodeTitle: Component<NodeTitleProps> = (props) => {
  return <CardTitle {...props} />;
};

export type NodeDescriptionProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export const NodeDescription: Component<NodeDescriptionProps> = (props) => {
  return <CardDescription {...props} />;
};

export type NodeActionProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const NodeAction: Component<NodeActionProps> = (props) => {
  return <button {...props} />;
};

export type NodeContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const NodeContent: Component<NodeContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CardContent class={cn("p-3", props.class)} {...rest} />
  );
};

export type NodeFooterProps = JSX.HTMLAttributes<HTMLDivElement>;

export const NodeFooter: Component<NodeFooterProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CardFooter
      class={cn("rounded-b-md border-t bg-secondary p-3!", props.class)}
      {...rest}
    />
  );
};

