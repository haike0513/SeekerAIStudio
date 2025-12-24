/**
 * Toolbar 组件（SolidJS 版本）
 * 用于显示工具栏（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export type ToolbarProps = JSX.HTMLAttributes<HTMLDivElement> & {
  position?: "top" | "bottom" | "left" | "right";
};

export const Toolbar: Component<ToolbarProps> = (props) => {
  const position = props.position ?? "bottom";
  const [, rest] = splitProps(props, ["class", "position", "children"]);
  
  const positionClasses = {
    top: "top-0 left-1/2 -translate-x-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2",
    left: "left-0 top-1/2 -translate-y-1/2",
    right: "right-0 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      class={cn(
        "absolute flex items-center gap-1 rounded-sm border bg-background p-1.5",
        positionClasses[position],
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

