/**
 * Context 组件（SolidJS 版本）
 * 用于显示模型上下文使用情况
 * 使用 tokenlens 库计算成本
 */

import { type Component, type JSX, createContext, useContext, createMemo, splitProps, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LanguageModelUsage } from "ai";
import { getUsage } from "tokenlens";

const PERCENT_MAX = 100;
const ICON_RADIUS = 10;
const ICON_VIEWBOX = 24;
const ICON_CENTER = 12;
const ICON_STROKE_WIDTH = 2;

type ModelId = string;

type ContextSchema = {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: ModelId;
};

const ContextContext = createContext<ContextSchema | null>(null);

const useContextValue = () => {
  const context = useContext(ContextContext);
  if (!context) {
    throw new Error("Context components must be used within Context");
  }
  return context;
};

export type ContextProps = JSX.HTMLAttributes<HTMLDivElement> & ContextSchema;

export const Context: Component<ContextProps> = (props) => {
  const { usedTokens, maxTokens, usage, modelId, ...rest } = props;
  const [, otherProps] = splitProps(rest, ["class", "children"]);

  return (
    <ContextContext.Provider
      value={{
        usedTokens,
        maxTokens,
        usage,
        modelId,
      }}
    >
      <HoverCard closeDelay={0} openDelay={0} {...otherProps}>
        {props.children}
      </HoverCard>
    </ContextContext.Provider>
  );
};

const ContextIcon: Component = () => {
  const { usedTokens, maxTokens } = useContextValue();
  const circumference = 2 * Math.PI * ICON_RADIUS;
  const usedPercent = usedTokens / maxTokens;
  const dashOffset = circumference * (1 - usedPercent);

  return (
    <svg
      aria-label="Model context usage"
      height="20"
      role="img"
      style={{ color: "currentcolor" }}
      viewBox={`0 0 ${ICON_VIEWBOX} ${ICON_VIEWBOX}`}
      width="20"
    >
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.25"
        r={ICON_RADIUS}
        stroke="currentColor"
        stroke-width={ICON_STROKE_WIDTH}
      />
      <circle
        cx={ICON_CENTER}
        cy={ICON_CENTER}
        fill="none"
        opacity="0.7"
        r={ICON_RADIUS}
        stroke="currentColor"
        stroke-dasharray={`${circumference} ${circumference}`}
        stroke-dashoffset={dashOffset}
        stroke-linecap="round"
        stroke-width={ICON_STROKE_WIDTH}
        style={{ transformOrigin: "center", transform: "rotate(-90deg)" }}
      />
    </svg>
  );
};

export type ContextTriggerProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ContextTrigger: Component<ContextTriggerProps> = (props) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = createMemo(() => usedTokens / maxTokens);
  const renderedPercent = createMemo(() =>
    new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(usedPercent())
  );

  const [, rest] = splitProps(props, ["children"]);

  return (
    <HoverCardTrigger asChild>
      {props.children ?? (
        <Button type="button" variant="ghost" {...rest}>
          <span class="font-medium text-muted-foreground">
            {renderedPercent()}
          </span>
          <ContextIcon />
        </Button>
      )}
    </HoverCardTrigger>
  );
};

export type ContextContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextContent: Component<ContextContentProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <HoverCardContent
      class={cn("min-w-60 divide-y overflow-hidden p-0", props.class)}
      {...rest}
    />
  );
};

export type ContextContentHeaderProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextContentHeader: Component<ContextContentHeaderProps> = (props) => {
  const { usedTokens, maxTokens } = useContextValue();
  const usedPercent = createMemo(() => usedTokens / maxTokens);
  const displayPct = createMemo(() =>
    new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    }).format(usedPercent())
  );
  const used = createMemo(() =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
    }).format(usedTokens)
  );
  const total = createMemo(() =>
    new Intl.NumberFormat("en-US", {
      notation: "compact",
    }).format(maxTokens)
  );

  const [, rest] = splitProps(props, ["class", "children"]);

  return (
    <div class={cn("w-full space-y-2 p-3", props.class)} {...rest}>
      {props.children ?? (
        <>
          <div class="flex items-center justify-between gap-3 text-xs">
            <p>{displayPct()}</p>
            <p class="font-mono text-muted-foreground">
              {used()} / {total()}
            </p>
          </div>
          <div class="space-y-2">
            <Progress class="bg-muted" value={usedPercent() * PERCENT_MAX} />
          </div>
        </>
      )}
    </div>
  );
};

export type ContextContentBodyProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextContentBody: Component<ContextContentBodyProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div class={cn("w-full p-3", props.class)} {...rest} />
  );
};

export type ContextContentFooterProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextContentFooter: Component<ContextContentFooterProps> = (props) => {
  const { modelId, usage } = useContextValue();
  const [, rest] = splitProps(props, ["class", "children"]);

  const totalCost = createMemo(() => {
    if (!modelId || !usage) {
      return "$0.00";
    }
    
    try {
      const costData = getUsage({
        modelId,
        usage: {
          input: usage.inputTokens ?? 0,
          output: usage.outputTokens ?? 0,
        },
      });
      const costUSD = costData.costUSD?.totalUSD ?? 0;
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(costUSD);
    } catch {
      return "$0.00";
    }
  });

  return (
    <div
      class={cn(
        "flex w-full items-center justify-between gap-3 bg-secondary p-3 text-xs",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <>
          <span class="text-muted-foreground">Total cost</span>
          <span>{totalCost()}</span>
        </>
      )}
    </div>
  );
};

export type ContextInputUsageProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextInputUsage: Component<ContextInputUsageProps> = (props) => {
  const { usage, modelId } = useContextValue();
  const inputTokens = createMemo(() => usage?.inputTokens ?? 0);
  const [, rest] = splitProps(props, ["class", "children"]);

  const inputCost = createMemo(() => {
    if (!modelId || !inputTokens()) return undefined;
    try {
      const costData = getUsage({
        modelId,
        usage: { input: inputTokens(), output: 0 },
      });
      return costData.costUSD?.totalUSD;
    } catch {
      return undefined;
    }
  });

  const inputCostText = createMemo(() => {
    const cost = inputCost();
    if (cost === undefined) return undefined;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cost);
  });

  return (
    <Show
      when={props.children || inputTokens() > 0}
      fallback={null}
    >
      {props.children ?? (
        <div
          class={cn("flex items-center justify-between text-xs", props.class)}
          {...rest}
        >
          <span class="text-muted-foreground">Input</span>
          <span>
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
            }).format(inputTokens())}
            <Show when={inputCostText()}>
              <span class="ml-2 text-muted-foreground">• {inputCostText()}</span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
};

export type ContextOutputUsageProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextOutputUsage: Component<ContextOutputUsageProps> = (props) => {
  const { usage, modelId } = useContextValue();
  const outputTokens = createMemo(() => usage?.outputTokens ?? 0);
  const [, rest] = splitProps(props, ["class", "children"]);

  const outputCost = createMemo(() => {
    if (!modelId || !outputTokens()) return undefined;
    try {
      const costData = getUsage({
        modelId,
        usage: { input: 0, output: outputTokens() },
      });
      return costData.costUSD?.totalUSD;
    } catch {
      return undefined;
    }
  });

  const outputCostText = createMemo(() => {
    const cost = outputCost();
    if (cost === undefined) return undefined;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cost);
  });

  return (
    <Show
      when={props.children || outputTokens() > 0}
      fallback={null}
    >
      {props.children ?? (
        <div
          class={cn("flex items-center justify-between text-xs", props.class)}
          {...rest}
        >
          <span class="text-muted-foreground">Output</span>
          <span>
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
            }).format(outputTokens())}
            <Show when={outputCostText()}>
              <span class="ml-2 text-muted-foreground">• {outputCostText()}</span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
};

export type ContextReasoningUsageProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextReasoningUsage: Component<ContextReasoningUsageProps> = (props) => {
  const { usage, modelId } = useContextValue();
  const reasoningTokens = createMemo(() => usage?.reasoningTokens ?? 0);
  const [, rest] = splitProps(props, ["class", "children"]);

  const reasoningCost = createMemo(() => {
    if (!modelId || !reasoningTokens()) return undefined;
    try {
      const costData = getUsage({
        modelId,
        usage: { reasoningTokens: reasoningTokens() },
      });
      return costData.costUSD?.totalUSD;
    } catch {
      return undefined;
    }
  });

  const reasoningCostText = createMemo(() => {
    const cost = reasoningCost();
    if (cost === undefined) return undefined;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cost);
  });

  return (
    <Show
      when={props.children || reasoningTokens() > 0}
      fallback={null}
    >
      {props.children ?? (
        <div
          class={cn("flex items-center justify-between text-xs", props.class)}
          {...rest}
        >
          <span class="text-muted-foreground">Reasoning</span>
          <span>
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
            }).format(reasoningTokens())}
            <Show when={reasoningCostText()}>
              <span class="ml-2 text-muted-foreground">• {reasoningCostText()}</span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
};

export type ContextCacheUsageProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ContextCacheUsage: Component<ContextCacheUsageProps> = (props) => {
  const { usage, modelId } = useContextValue();
  const cacheTokens = createMemo(() => usage?.cachedInputTokens ?? 0);
  const [, rest] = splitProps(props, ["class", "children"]);

  const cacheCost = createMemo(() => {
    if (!modelId || !cacheTokens()) return undefined;
    try {
      const costData = getUsage({
        modelId,
        usage: { cacheReads: cacheTokens(), input: 0, output: 0 },
      });
      return costData.costUSD?.totalUSD;
    } catch {
      return undefined;
    }
  });

  const cacheCostText = createMemo(() => {
    const cost = cacheCost();
    if (cost === undefined) return undefined;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cost);
  });

  return (
    <Show
      when={props.children || cacheTokens() > 0}
      fallback={null}
    >
      {props.children ?? (
        <div
          class={cn("flex items-center justify-between text-xs", props.class)}
          {...rest}
        >
          <span class="text-muted-foreground">Cache</span>
          <span>
            {new Intl.NumberFormat("en-US", {
              notation: "compact",
            }).format(cacheTokens())}
            <Show when={cacheCostText()}>
              <span class="ml-2 text-muted-foreground">• {cacheCostText()}</span>
            </Show>
          </span>
        </div>
      )}
    </Show>
  );
};

