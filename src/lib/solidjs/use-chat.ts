/**
 * useChat Hook（SolidJS 版本）
 * 基于 Vercel AI SDK v6 的 UI Chat 抽象（AbstractChat）
 *
 * 作用：
 * - 复用 `ai` 包中的 `AbstractChat`、`DefaultChatTransport`、`UIMessage` 等
 * - 将其封装成 SolidJS 风格的 Hook（返回的是 Solid 信号）
 * - 请求协议保持与 React 版 `useChat` / 默认 UI Chat 一致，并适配本项目的 `/api/chat` 路由
 */

import { createSignal, onCleanup, type Accessor } from "solid-js";
import { AbstractChat, type ChatInit, type ChatStatus, DefaultChatTransport, type UIMessage } from "ai";
import { Chat } from "./chat.react";

// 对外再导出，方便业务侧直接使用 `UIMessage` / `CreateUIMessage` 类型
export type { UIMessage, CreateUIMessage } from "ai";

/**
 * Solid 版 useChat 返回的辅助类型
 *
 * 与 React 版差异：
 * - `messages` / `status` / `error` 都是 Solid 的 `Accessor` 信号
 * - 其他方法（sendMessage / regenerate / stop / addToolOutput 等）与 React 基本一致
 */
export type UseChatHelpers<UI_MESSAGE extends UIMessage> = {
  /**
   * Chat 的唯一标识（由 AI SDK 生成或传入）
   */
  readonly id: string;

  /**
   * 当前 UI 消息列表（Solid `Accessor`）
   */
  readonly messages: Accessor<UI_MESSAGE[]>;

  /**
   * 当前状态：'submitted' | 'streaming' | 'ready' | 'error'
   */
  readonly status: Accessor<ChatStatus>;

  /**
   * 当前错误（如有）
   */
  readonly error: Accessor<Error | undefined>;

  /**
   * 本地更新 messages，不会自动触发 API 请求。
   * 一般用于手动编辑历史记录，然后再调用 `regenerate`。
   */
  setMessages: (
    messages: UI_MESSAGE[] | ((messages: UI_MESSAGE[]) => UI_MESSAGE[]),
  ) => void;
} & Pick<
  AbstractChat<UI_MESSAGE>,
  | "sendMessage"
  | "regenerate"
  | "stop"
  | "resumeStream"
  | "addToolResult"
  | "addToolOutput"
  | "addToolApprovalResponse"
  | "clearError"
>;

/**
 * 允许 `headers` / `body` 等为常量或函数（可返回 Promise）
 */
type Resolvable<T> = T | (() => T | Promise<T>);

/**
 * Solid 版本 useChat 的配置项
 *
 * 与 React 版的设计基本保持一致：
 * - 可以直接传入已创建好的 `Chat` 实例（复用状态）
 * - 或者传入一组初始化参数，由 Hook 内部创建 `Chat`
 * - 额外增加了一些 HTTP 相关选项（api / credentials / headers / body / fetch）
 */
type UseChatInitOptions<UI_MESSAGE extends UIMessage> = ChatInit<UI_MESSAGE> & {
  /**
   * 初始消息列表（UIMessage），通常来自服务器侧的历史记录。
   * 会作为 Chat 的初始状态参与后续对话。
   */
  initialMessages?: UI_MESSAGE[];

  /**
   * Chat 接口地址，默认 `/api/chat`
   */
  api?: string;

  /**
   * fetch 的 credentials 配置
   */
  credentials?: RequestCredentials;

  /**
   * 请求头，可以是对象或函数
   */
  headers?: Resolvable<Record<string, string> | Headers>;

  /**
   * 额外请求体字段（例如传递 chatId 等）
   */
  body?: Resolvable<Record<string, unknown>>;

  /**
   * 自定义 fetch 实现
   */
  fetch?: typeof fetch;
};

export type UseChatOptions<UI_MESSAGE extends UIMessage> = (
  | {
      /**
       * 直接复用已有的 Chat 实例
       */
      chat: Chat<UI_MESSAGE>;
    }
  | UseChatInitOptions<UI_MESSAGE>
) & {
  /**
   * 自定义节流毫秒数，用于 message / status / error 的回调更新。
   * 默认不节流。
   */
  experimental_throttle?: number;

  /**
   * 是否在挂载后尝试恢复上一次未完成的流式响应。
   */
  resume?: boolean;
};

/**
 * 将 UIMessage 转换为本项目后端 `/api/chat` 期望的消息格式：
 * `{ role, content }`，其中 content 为聚合后的纯文本。
 */
function convertUIToRequestMessages(uiMessages: UIMessage[]): {
  role: "user" | "assistant" | "system";
  content: string;
}[] {
  return uiMessages.map((message) => {
    const text =
      (message.parts ?? [])
        .map((part) =>
          part && part.type === "text" && typeof part.text === "string"
            ? part.text
            : "",
        )
        .join("") || "";

    return {
      role: message.role as "user" | "assistant" | "system",
      content: text,
    };
  });
}

export function useChat<UI_MESSAGE extends UIMessage = UIMessage>(
  options: UseChatOptions<UI_MESSAGE> = {} as UseChatOptions<UI_MESSAGE>,
): UseChatHelpers<UI_MESSAGE> {
  const {
    experimental_throttle: throttleWaitMs,
    resume = false,
    ...rest
  } = options;

  // 初始化 Chat 实例
  let chat: Chat<UI_MESSAGE>;

  if ("chat" in rest) {
    // 外部直接传入 Chat 实例（共享状态）
    chat = rest.chat;
  } else {
    const {
      api = "/api/chat",
      credentials,
      headers,
      body,
      fetch: customFetch,
      initialMessages = [],
      ...chatInit
    } = rest as UseChatInitOptions<UI_MESSAGE>;

    const transport =
      chatInit.transport ??
      new DefaultChatTransport<UI_MESSAGE>({
        api,
        credentials,
        headers,
        body,
        fetch: customFetch,
        // 将 UIMessage 转成后端期望的 `{ role, content }` 结构
        prepareSendMessagesRequest: async ({
          api: baseApi,
          id: _chatId,
          messages,
          body: mergedBody,
          headers: mergedHeaders,
          credentials: mergedCredentials,
        }) => ({
          api: baseApi,
          credentials: mergedCredentials,
          headers: {
            ...mergedHeaders,
            "Content-Type": "application/json",
          },
          body: {
            ...mergedBody,
            // 使用纯文本消息数组，后端再转换为 `streamText` 所需格式
            messages: convertUIToRequestMessages(messages),
            // 这里不直接使用 `id`，而是交由上层的 `body`（如 chatId）控制会话 ID
          },
        }),
      });

    chat = new Chat<UI_MESSAGE>({
      ...chatInit,
      messages: chatInit.messages ?? initialMessages,
      transport,
    });
  }

  // Solid 状态：messages / status / error
  const [messages, setMessagesSignal] = createSignal<UI_MESSAGE[]>(
    chat.messages,
  );
  const [status, setStatusSignal] = createSignal<ChatStatus>(chat.status);
  const [error, setErrorSignal] = createSignal<Error | undefined>(chat.error);

  // 订阅 Chat 状态变化
  const unsubscribeMessages = chat["~registerMessagesCallback"](
    () => {
      setMessagesSignal(chat.messages);
      setStatusSignal(chat.status);
      setErrorSignal(chat.error);
    },
    throttleWaitMs,
  );

  const unsubscribeStatus = chat["~registerStatusCallback"](() => {
    setStatusSignal(chat.status);
  });

  const unsubscribeError = chat["~registerErrorCallback"](() => {
    setErrorSignal(chat.error);
  });

  onCleanup(() => {
    unsubscribeMessages?.();
    unsubscribeStatus?.();
    unsubscribeError?.();
  });

  // 可选：挂载时尝试恢复未完成的流
  if (resume) {
    // 不阻塞当前调用
    void chat.resumeStream().catch(() => {
      // 恢复失败时交由 Chat 内部的 onError 处理
    });
  }

  const setMessages: UseChatHelpers<UI_MESSAGE>["setMessages"] = (
    messagesParam,
  ) => {
    const nextMessages =
      typeof messagesParam === "function"
        ? (messagesParam as (prev: UI_MESSAGE[]) => UI_MESSAGE[])(chat.messages)
        : messagesParam;

    chat.messages = nextMessages;
    // 虽然 ChatState 会触发回调，这里立即同步一次，保证 Solid 状态及时更新
    setMessagesSignal(nextMessages);
  };

  return {
    id: chat.id,
    messages,
    status,
    error,
    setMessages,
    sendMessage: chat.sendMessage,
    regenerate: chat.regenerate,
    clearError: chat.clearError,
    stop: chat.stop,
    resumeStream: chat.resumeStream,
    /**
     * @deprecated 使用 `addToolOutput` 替代
     */
    addToolResult: chat.addToolOutput,
    addToolOutput: chat.addToolOutput,
    addToolApprovalResponse: chat.addToolApprovalResponse,
  };
}

