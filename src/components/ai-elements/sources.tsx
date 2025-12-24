/**
 * Sources 组件（SolidJS 版本）
 * 用于显示引用的来源
 */

import { type Component, type JSX, splitProps } from "solid-js";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Book, ChevronDown } from "lucide-solid";

export type SourcesProps = JSX.HTMLAttributes<HTMLDivElement>;

export const Sources: Component<SourcesProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <Collapsible
      class={cn("not-prose mb-4 text-primary text-xs", props.class)}
      {...rest}
    />
  );
};

export type SourcesTriggerProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  count: number;
};

export const SourcesTrigger: Component<SourcesTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "count", "children"]);
  
  return (
    <CollapsibleTrigger
      class={cn("flex items-center gap-2", props.class)}
      {...rest}
    >
      {props.children ?? (
        <>
          <p class="font-medium">Used {props.count} sources</p>
          <ChevronDown size={16} />
        </>
      )}
    </CollapsibleTrigger>
  );
};

export type SourcesContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const SourcesContent: Component<SourcesContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CollapsibleContent
      class={cn(
        "mt-3 flex w-fit flex-col gap-2",
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
        props.class
      )}
      {...rest}
    />
  );
};

export type SourceProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  title?: string;
};

export const Source: Component<SourceProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "href", "title", "children"]);
  
  return (
    <a
      class={cn("flex items-center gap-2", props.class)}
      href={props.href}
      rel="noreferrer"
      target="_blank"
      {...rest}
    >
      {props.children ?? (
        <>
          <Book size={16} />
          <span class="block font-medium">{props.title}</span>
        </>
      )}
    </a>
  );
};

