/**
 * Suggestion 组件（SolidJS 版本）
 * 用于显示建议按钮列表
 */

import { type Component, type JSX, For, splitProps } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SuggestionsProps = JSX.HTMLAttributes<HTMLDivElement> & {
  suggestions?: string[];
};

export const Suggestions: Component<SuggestionsProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children", "suggestions"]);
  
  return (
    <div
      class={cn(
        "w-full overflow-x-auto whitespace-nowrap",
        props.class
      )}
      {...rest}
    >
      <div class="flex w-max flex-nowrap items-center gap-2">
        {props.children ?? (
          <For each={props.suggestions}>
            {(suggestion) => (
              <Suggestion
                suggestion={suggestion}
                onClick={(s) => {
                  // 默认行为：可以在这里处理点击
                }}
              />
            )}
          </For>
        )}
      </div>
    </div>
  );
};

export type SuggestionProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion: Component<SuggestionProps> = (props) => {
  const handleClick = () => {
    props.onClick?.(props.suggestion);
  };

  const [, rest] = splitProps(props, ["suggestion", "onClick", "class", "variant", "size", "children"]);

  return (
    <Button
      class={cn("cursor-pointer rounded-full px-4", props.class)}
      onClick={handleClick}
      size={props.size ?? "sm"}
      type="button"
      variant={props.variant ?? "outline"}
      {...rest}
    >
      {props.children ?? props.suggestion}
    </Button>
  );
};

