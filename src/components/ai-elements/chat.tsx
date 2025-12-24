/**
 * Chat 组件（SolidJS 版本）
 * 整合 Message 和 PromptInput 组件，提供完整的聊天界面
 */

import { type Component, type JSX, For, Show, splitProps } from "solid-js";
import { useChat, type UseChatHelpers } from "@/lib/solidjs/use-chat";
import { Message, MessageContent, MessageActions } from "./message";
import { PromptInput, PromptInputProvider } from "./prompt-input";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";

export type ChatProps = JSX.HTMLAttributes<HTMLDivElement> & {
  /**
   * useChat hook 的返回值
   * 如果不提供，组件内部会创建一个新的 useChat 实例
   */
  chat?: UseChatHelpers<UIMessage>;
  
  /**
   * useChat 的配置选项
   * 仅在未提供 chat 时使用
   */
  chatOptions?: Parameters<typeof useChat>[0];
  
  /**
   * 自定义消息渲染
   */
  renderMessage?: (message: UIMessage, index: number) => JSX.Element;
  
  /**
   * 空状态显示
   */
  emptyState?: JSX.Element;
};

export const Chat: Component<ChatProps> = (props) => {
  const chat = props.chat ?? useChat(props.chatOptions || {});
  
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    // PromptInput 组件会处理输入值的获取和清空
    // 这里只需要处理消息发送
    const form = e.target as HTMLFormElement;
    const textarea = form.querySelector("textarea");
    const input = textarea?.value;
    if (!input?.trim()) return;
    
    await chat.sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    });
  };

  const isLoading = () => 
    chat.status() === "streaming" || chat.status() === "submitted";

  const [, rest] = splitProps(props, [
    "class",
    "chat",
    "chatOptions",
    "renderMessage",
    "emptyState",
    "children",
  ]);

  return (
    <div
      class={cn("flex flex-col h-full", props.class)}
      {...rest}
    >
      {/* 消息列表 */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <Show
          when={chat.messages().length > 0}
          fallback={
            props.emptyState ?? (
              <div class="flex items-center justify-center h-full text-muted-foreground">
                <p>开始对话...</p>
              </div>
            )
          }
        >
          <For each={chat.messages()}>
            {(message, index) => {
              if (props.renderMessage) {
                return props.renderMessage(message, index());
              }

              const isUser = message.role === "user";
              const textContent = message.parts
                ?.filter((part) => part && part.type === "text")
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("") || "";

              return (
                <Message from={message.role}>
                  <MessageContent>
                    <p class="whitespace-pre-wrap break-words">{textContent}</p>
                  </MessageContent>
                  <Show when={!isUser && isLoading() && index() === chat.messages().length - 1}>
                    <MessageActions>
                      <span class="text-xs text-muted-foreground">正在输入...</span>
                    </MessageActions>
                  </Show>
                </Message>
              );
            }}
          </For>
        </Show>
      </div>

      {/* 输入区域 */}
      <div class="border-t p-4">
        <PromptInputProvider>
          <PromptInput
            status={chat.status()}
            onSubmit={handleSubmit}
          />
        </PromptInputProvider>
      </div>

      {props.children}
    </div>
  );
};

