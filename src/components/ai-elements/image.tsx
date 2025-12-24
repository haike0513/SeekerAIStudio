/**
 * Image 组件（SolidJS 版本）
 * 用于显示 AI 生成的图片
 */

import { type Component, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Experimental_GeneratedImage & {
  class?: string;
  alt?: string;
};

export const Image: Component<ImageProps> = (props) => {
  const { base64, mediaType, ...rest } = props;
  const [, otherProps] = splitProps(rest, ["class", "alt"]);

  return (
    <img
      {...otherProps}
      alt={props.alt}
      class={cn(
        "h-auto max-w-full overflow-hidden rounded-md",
        props.class
      )}
      src={`data:${mediaType};base64,${base64}`}
    />
  );
};

