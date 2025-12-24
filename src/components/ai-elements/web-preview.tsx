/**
 * WebPreview 组件（SolidJS 版本）
 * 用于预览网页
 */

import { type Component, type JSX, type Accessor, createContext, useContext, createSignal, createEffect, splitProps, Show, For } from "solid-js";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-solid";

export type WebPreviewContextValue = {
  url: Accessor<string>;
  setUrl: (url: string) => void;
  consoleOpen: Accessor<boolean>;
  setConsoleOpen: (open: boolean) => void;
};

const WebPreviewContext = createContext<WebPreviewContextValue | null>(null);

const useWebPreview = () => {
  const context = useContext(WebPreviewContext);
  if (!context) {
    throw new Error("WebPreview components must be used within a WebPreview");
  }
  return context;
};

export type WebPreviewProps = JSX.HTMLAttributes<HTMLDivElement> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
};

export const WebPreview: Component<WebPreviewProps> = (props) => {
  const [url, setUrl] = createSignal(props.defaultUrl ?? "");
  const [consoleOpen, setConsoleOpen] = createSignal(false);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    props.onUrlChange?.(newUrl);
  };

  const [, rest] = splitProps(props, ["class", "defaultUrl", "onUrlChange", "children"]);

  return (
    <WebPreviewContext.Provider
      value={{
        url,
        setUrl: handleUrlChange,
        consoleOpen,
        setConsoleOpen,
      }}
    >
      <div
        class={cn(
          "flex size-full flex-col rounded-lg border bg-card",
          props.class
        )}
        {...rest}
      >
        {props.children}
      </div>
    </WebPreviewContext.Provider>
  );
};

export type WebPreviewNavigationProps = JSX.HTMLAttributes<HTMLDivElement>;

export const WebPreviewNavigation: Component<WebPreviewNavigationProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "children"]);
  
  return (
    <div
      class={cn("flex items-center gap-1 border-b p-2", props.class)}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type WebPreviewNavigationButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  tooltip?: string;
};

export const WebPreviewNavigationButton: Component<WebPreviewNavigationButtonProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "onClick", "disabled", "tooltip", "children"]);
  
  const button = (
    <Button
      class={cn("h-8 w-8 p-0 hover:text-foreground", props.class)}
      disabled={props.disabled}
      onClick={props.onClick}
      size="sm"
      variant="ghost"
      {...rest}
    >
      {props.children}
    </Button>
  );

  if (props.tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>{props.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
};

export type WebPreviewUrlProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export const WebPreviewUrl: Component<WebPreviewUrlProps> = (props) => {
  const { url, setUrl } = useWebPreview();
  const [inputValue, setInputValue] = createSignal(url());

  // Sync input value with context URL when it changes externally
  createEffect(() => {
    setInputValue(url());
  });

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    setInputValue(target.value);
    props.onChange?.(e);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      setUrl(target.value);
    }
    props.onKeyDown?.(e);
  };

  const [, rest] = splitProps(props, ["value", "onChange", "onKeyDown", "placeholder"]);

  return (
    <Input
      class="h-8 flex-1 text-sm"
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Enter URL..."
      value={props.value ?? inputValue()}
      {...rest}
    />
  );
};

export type WebPreviewBodyProps = JSX.IframeHTMLAttributes<HTMLIFrameElement> & {
  loading?: JSX.Element;
};

export const WebPreviewBody: Component<WebPreviewBodyProps> = (props) => {
  const { url } = useWebPreview();
  const [, rest] = splitProps(props, ["class", "loading", "src"]);

  return (
    <div class="flex-1">
      <iframe
        class={cn("size-full", props.class)}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        src={(props.src ?? url()) || undefined}
        title="Preview"
        {...rest}
      />
      {props.loading}
    </div>
  );
};

export type WebPreviewConsoleProps = JSX.HTMLAttributes<HTMLDivElement> & {
  logs?: Array<{
    level: "log" | "warn" | "error";
    message: string;
    timestamp: Date;
  }>;
};

export const WebPreviewConsole: Component<WebPreviewConsoleProps> = (props) => {
  const { consoleOpen, setConsoleOpen } = useWebPreview();
  const [, rest] = splitProps(props, ["class", "logs", "children"]);

  return (
    <Collapsible
      class={cn("border-t bg-muted/50 font-mono text-sm", props.class)}
      onOpenChange={setConsoleOpen}
      open={consoleOpen()}
      {...rest}
    >
      <CollapsibleTrigger asChild>
        <Button
          class="flex w-full items-center justify-between p-4 text-left font-medium hover:bg-muted/50"
          variant="ghost"
        >
          Console
          <ChevronDown
            size={16}
            class={cn(
              "h-4 w-4 transition-transform duration-200",
              consoleOpen() && "rotate-180"
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        class={cn(
          "px-4 pb-4",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <div class="max-h-48 space-y-1 overflow-y-auto">
          <Show
            when={props.logs && props.logs.length > 0}
            fallback={<p class="text-muted-foreground">No console output</p>}
          >
            <For each={props.logs}>
              {(log, index) => (
                <div
                  class={cn(
                    "text-xs",
                    log.level === "error" && "text-destructive",
                    log.level === "warn" && "text-yellow-600",
                    log.level === "log" && "text-foreground"
                  )}
                >
                  <span class="text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>{" "}
                  {log.message}
                </div>
              )}
            </For>
          </Show>
          {props.children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

