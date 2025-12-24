/**
 * Controls 组件（SolidJS 版本）
 * 用于显示控制按钮（需要 ReactFlow）
 * 
 * 注意：这是一个简化版本，不包含 ReactFlow 的完整功能
 * 如果需要完整功能，需要安装 @xyflow/react
 */

import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-solid";
import { Button } from "@/components/ui/button";

export type ControlsProps = JSX.HTMLAttributes<HTMLDivElement> & {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
};

export const Controls: Component<ControlsProps> = (props) => {
  const [, rest] = splitProps(props, [
    "class",
    "onZoomIn",
    "onZoomOut",
    "onFitView",
    "children",
  ]);
  
  return (
    <div
      class={cn(
        "gap-px overflow-hidden rounded-md border bg-card p-1 shadow-none!",
        "[&>button]:rounded-md [&>button]:border-none! [&>button]:bg-transparent! [&>button]:hover:bg-secondary!",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={props.onZoomIn}
            type="button"
          >
            <ZoomIn size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={props.onZoomOut}
            type="button"
          >
            <ZoomOut size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={props.onFitView}
            type="button"
          >
            <Maximize2 size={16} />
          </Button>
        </>
      )}
    </div>
  );
};

