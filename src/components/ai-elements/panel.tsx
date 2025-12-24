/**
 * Panel 组件（SolidJS 版本）
 * 用于显示面板（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export type PanelProps = JSX.HTMLAttributes<HTMLDivElement> & {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export const Panel: Component<PanelProps> = (props) => {
  const position = props.position ?? "top-left";
  const [, rest] = splitProps(props, ["class", "position", "children"]);
  
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <div
      class={cn(
        "absolute m-4 overflow-hidden rounded-md border bg-card p-1",
        positionClasses[position],
        props.class
      )}
      {...rest}
    >
      {props.children}
    </div>
  );
};

