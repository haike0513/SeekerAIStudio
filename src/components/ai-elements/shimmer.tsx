/**
 * Shimmer 组件（SolidJS 版本）
 * 用于显示闪烁动画效果
 * 
 * 注意：这是一个简化版本，使用 CSS 动画而不是 motion/react
 */

import { type Component, type JSX, splitProps, createMemo } from "solid-js";
import { cn } from "@/lib/utils";

export type TextShimmerProps = JSX.HTMLAttributes<HTMLElement> & {
  children: string;
  as?: keyof JSX.IntrinsicElements;
  duration?: number;
  spread?: number;
};

export const Shimmer: Component<TextShimmerProps> = (props) => {
  const duration = props.duration ?? 2;
  const spread = props.spread ?? 2;
  const Component = props.as ?? "p";
  
  const dynamicSpread = createMemo(() => (props.children?.length ?? 0) * spread);
  
  const [, rest] = splitProps(props, ["class", "children", "as", "duration", "spread"]);

  return (
    <Component
      class={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent animate-shimmer",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        props.class
      )}
      style={{
        "--spread": `${dynamicSpread()}px`,
        "background-image":
          "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        "animation-duration": `${duration}s`,
        "animation-iteration-count": "infinite",
      } as JSX.CSSProperties}
      {...rest}
    >
      {props.children}
    </Component>
  );
};

