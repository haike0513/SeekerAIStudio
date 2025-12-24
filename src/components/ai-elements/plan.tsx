/**
 * Plan 组件（SolidJS 版本）
 * 用于显示计划/规划
 */

import { type Component, type JSX, createContext, useContext, splitProps, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-solid";
import { Shimmer } from "./shimmer";

type PlanContextValue = {
  isStreaming: () => boolean;
};

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error("Plan components must be used within Plan");
  }
  return context;
};

export type PlanProps = JSX.HTMLAttributes<HTMLDivElement> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const Plan: Component<PlanProps> = (props) => {
  const isStreaming = () => props.isStreaming ?? false;
  const [, rest] = splitProps(props, [
    "class",
    "isStreaming",
    "open",
    "defaultOpen",
    "onOpenChange",
    "children",
  ]);

  return (
    <PlanContext.Provider value={{ isStreaming }}>
      <Collapsible
        data-slot="plan"
        open={props.open}
        defaultOpen={props.defaultOpen}
        onOpenChange={props.onOpenChange}
        {...rest}
      >
        <Card class={cn("shadow-none", props.class)}>
          {props.children}
        </Card>
      </Collapsible>
    </PlanContext.Provider>
  );
};

export type PlanHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export const PlanHeader: Component<PlanHeaderProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CardHeader
      class={cn("flex items-start justify-between", props.class)}
      data-slot="plan-header"
      {...rest}
    />
  );
};

export type PlanTitleProps = Omit<JSX.HTMLAttributes<HTMLHeadingElement>, "children"> & {
  children: string;
};

export const PlanTitle: Component<PlanTitleProps> = (props) => {
  const { isStreaming } = usePlan();
  const [, rest] = splitProps(props, ["children"]);

  return (
    <CardTitle data-slot="plan-title" {...rest}>
      <Show when={isStreaming()} fallback={props.children}>
        <Shimmer>{props.children}</Shimmer>
      </Show>
    </CardTitle>
  );
};

export type PlanDescriptionProps = Omit<JSX.HTMLAttributes<HTMLParagraphElement>, "children"> & {
  children: string;
};

export const PlanDescription: Component<PlanDescriptionProps> = (props) => {
  const { isStreaming } = usePlan();
  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <CardDescription
      class={cn("text-balance", props.class)}
      data-slot="plan-description"
      {...rest}
    >
      <Show when={isStreaming()} fallback={props.children}>
        <Shimmer>{props.children}</Shimmer>
      </Show>
    </CardDescription>
  );
};

export type PlanActionProps = JSX.HTMLAttributes<HTMLButtonElement>;

export const PlanAction: Component<PlanActionProps> = (props) => {
  return <button data-slot="plan-action" {...props} />;
};

export type PlanContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const PlanContent: Component<PlanContentProps> = (props) => {
  return (
    <CollapsibleContent asChild>
      <CardContent data-slot="plan-content" {...props} />
    </CollapsibleContent>
  );
};

export type PlanFooterProps = JSX.HTMLAttributes<HTMLDivElement>;

export const PlanFooter: Component<PlanFooterProps> = (props) => {
  return <CardFooter data-slot="plan-footer" {...props} />;
};

export type PlanTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const PlanTrigger: Component<PlanTriggerProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <CollapsibleTrigger asChild>
      <Button
        class={cn("size-8", props.class)}
        data-slot="plan-trigger"
        size="icon"
        variant="ghost"
        {...rest}
      >
        <ChevronsUpDown size={16} />
        <span class="sr-only">Toggle plan</span>
      </Button>
    </CollapsibleTrigger>
  );
};

