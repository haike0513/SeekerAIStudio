/**
 * Canvas 组件（SolidJS 版本）
 * 用于显示画布（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export type CanvasProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Canvas: Component<CanvasProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn(
        "relative size-full",
        props.class
      )}
      {...rest}
    >
      {/* 背景网格 */}
      <div
        class="absolute inset-0"
        style={{
          "background-image":
            "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
          "background-size": "20px 20px",
        }}
      />
      {props.children}
    </div>
  );
};

