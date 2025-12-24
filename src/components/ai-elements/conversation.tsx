/**
 * Conversation 组件（SolidJS 版本）
 * 用于显示对话列表
 * 集成了 use-stick-to-bottom 的自动滚动功能
 */

import { type Component, type JSX, createContext, useContext, Show, splitProps, createMemo } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-solid";
import { useStickToBottom, type StickToBottomOptions } from "@/lib/solidjs/use-stick-to-bottom";

type ConversationContextValue = {
  isAtBottom: () => boolean;
  scrollToBottom: () => void;
  contentRef: (ref: HTMLElement | null) => void;
  scrollRef: (ref: HTMLElement | null) => void;
};

// 在 SolidJS 中，Context 的默认值使用 null（与其他组件保持一致）
const ConversationContext = createContext<ConversationContextValue | null>(null);

// 保留这个辅助函数以便向后兼容，但组件应该直接使用 useContext
export const useConversationContext = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error("Conversation components must be used within Conversation");
  }
  return context;
};

export type ConversationProviderProps = {
  /**
   * use-stick-to-bottom 的配置选项
   */
  stickToBottomOptions?: StickToBottomOptions;
  children: JSX.Element;
};

/**
 * ConversationProvider 组件
 * 提供 Conversation Context，可以在外层使用
 * 管理滚动逻辑，但不渲染 UI 容器
 */
export const ConversationProvider: Component<ConversationProviderProps> = (props) => {
  const stickToBottom = useStickToBottom(props.stickToBottomOptions);

  // 在 SolidJS 中，Context.Provider 的 value 应该使用 createMemo 稳定引用
  // 特别是当包含函数或访问器时
  const contextValue = createMemo<ConversationContextValue>(() => ({
    isAtBottom: stickToBottom.isAtBottom,
    scrollToBottom: () => stickToBottom.scrollToBottom(),
    contentRef: stickToBottom.contentRef,
    scrollRef: stickToBottom.scrollRef,
  }));

  return (
    <ConversationContext.Provider value={contextValue()}>
      {props.children}
    </ConversationContext.Provider>
  );
};

export type ConversationProps = JSX.HTMLAttributes<HTMLDivElement> & {
  /**
   * use-stick-to-bottom 的配置选项
   * 如果在外层使用了 ConversationProvider，则此选项会被忽略
   */
  stickToBottomOptions?: StickToBottomOptions;
};

/**
 * Conversation 组件
 * 包含滚动容器的对话列表组件
 * 如果在外层使用了 ConversationProvider，则使用 context 中的 scrollRef
 * 否则，创建自己的 Provider 和 scrollRef
 */
export const Conversation: Component<ConversationProps> = (props) => {
  const { stickToBottomOptions, ...restProps } = props;
  const [, rest] = splitProps(restProps, ["class", "children"]);

  // 检查是否已经有外层的 Provider
  const existingContext = useContext(ConversationContext);
  const hasProvider = existingContext !== null;

  // 如果没有外层 Provider，则创建自己的 Provider
  if (!hasProvider) {
    const stickToBottom = useStickToBottom(stickToBottomOptions);

    const contextValue = createMemo<ConversationContextValue>(() => ({
      isAtBottom: stickToBottom.isAtBottom,
      scrollToBottom: () => stickToBottom.scrollToBottom(),
      contentRef: stickToBottom.contentRef,
      scrollRef: stickToBottom.scrollRef,
    }));

    return (
      <ConversationContext.Provider value={contextValue()}>
        <div
          ref={stickToBottom.scrollRef}
          class={cn("relative flex-1", props.class)}
          style={{ height: "100%", width: "100%" }}
          role="log"
          {...rest}
        >
          {props.children}
        </div>
      </ConversationContext.Provider>
    );
  }

  // 如果有外层 Provider，使用 context 中的 scrollRef
  return (
    <div
      ref={existingContext.scrollRef}
      class={cn("relative flex-1", props.class)}
      style={{ height: "100%", width: "100%" }}
      role="log"
      {...rest}
    >
      {props.children}
    </div>
  );
};

export type ConversationContentProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ConversationContent: Component<ConversationContentProps> = (props) => {
  // 在 SolidJS 中，useContext 应该直接在组件顶层调用
  const context = useContext(ConversationContext);
  
  if (!context) {
    throw new Error("ConversationContent must be used within Conversation");
  }
  
  const { contentRef } = context;
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <div
      ref={contentRef}
      class={cn("flex flex-col gap-8 p-4", props.class)}
      {...rest}
    />
  );
};

export type ConversationEmptyStateProps = JSX.HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  icon?: JSX.Element;
};

export const ConversationEmptyState: Component<ConversationEmptyStateProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "title", "description", "icon", "children"]);
  
  return (
    <div
      class={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <>
          <Show when={props.icon}>
            <div class="text-muted-foreground">{props.icon}</div>
          </Show>
          <div class="space-y-1">
            <h3 class="font-medium text-sm">{props.title ?? "No messages yet"}</h3>
            <Show when={props.description}>
              <p class="text-muted-foreground text-sm">
                {props.description ?? "Start a conversation to see messages here"}
              </p>
            </Show>
          </div>
        </>
      )}
    </div>
  );
};

export type ConversationScrollButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ConversationScrollButton: Component<ConversationScrollButtonProps> = (props) => {
  // 在 SolidJS 中，useContext 应该在组件顶层调用
  const context = useContext(ConversationContext);
  
  if (!context) {
    throw new Error("ConversationScrollButton must be used within Conversation");
  }
  
  const { isAtBottom, scrollToBottom } = context;
  const [, rest] = splitProps(props, ["class"]);

  return (
    <Show when={!isAtBottom()}>
      <Button
        class={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full",
          props.class
        )}
        onClick={scrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...rest}
      >
        <ArrowDown size={16} />
      </Button>
    </Show>
  );
};

