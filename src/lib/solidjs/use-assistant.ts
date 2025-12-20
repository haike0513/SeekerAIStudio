/**
 * useAssistant Hook - 用于助手交互
 * 基于 Vercel AI SDK React 的 useAssistant API
 */

import {
  createSignal,
  onCleanup,
  batch,
} from "solid-js";
import type {
  Message,
  AssistantRequestOptions,
  UseAssistantReturn,
} from "./types";
import {
  createMessageId,
  getHeaders,
  getBody,
  parseSSEData,
  mergeMessageContent,
} from "./utils";

export function useAssistant(
  options: AssistantRequestOptions,
): UseAssistantReturn {
  const {
    api,
    threadId: initialThreadId,
    credentials = "same-origin",
    headers: headersOption,
    body: bodyOption,
    fetch: customFetch = fetch,
  } = options;

  // 状态
  const [threadId, setThreadId] = createSignal<string | undefined>(
    initialThreadId,
  );
  const [messages, setMessages] = createSignal<Message[]>([]);
  const [input, setInput] = createSignal<string>("");
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<Error | undefined>(undefined);

  // 当前请求的 AbortController
  let abortController: AbortController | null = null;

  // 发送消息
  const append = async (
    message: Omit<Message, "id" | "createdAt">,
  ): Promise<void> => {
    const userMessage: Message = {
      ...message,
      id: createMessageId(),
      createdAt: new Date(),
    };

    // 添加用户消息到列表
    setMessages((prev) => [...prev, userMessage]);

    // 创建助手消息占位符
    const assistantMessageId = createMessageId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(true);
    setError(undefined);

    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();

    try {
      const currentThreadId = threadId();

      const response = await customFetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(headersOption),
        },
        credentials,
        signal: abortController.signal,
        body: JSON.stringify({
          threadId: currentThreadId,
          message: typeof userMessage.content === "string"
            ? userMessage.content
            : userMessage.content,
          ...getBody(bodyOption),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`,
        );
      }

      // 检查响应头中的 threadId
      const responseThreadId = response.headers.get("X-Assistant-Thread-Id");
      if (responseThreadId && responseThreadId !== currentThreadId) {
        setThreadId(responseThreadId);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              // 处理不同类型的消息
              if (parsed.type === "text-delta" || parsed.type === "content") {
                const text = parsed.textDelta || parsed.text || "";
                if (text) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.id === assistantMessageId) {
                      updated[updated.length - 1] = {
                        ...lastMsg,
                        content: mergeMessageContent(lastMsg.content, text),
                      };
                    }
                    return updated;
                  });
                }
              } else if (parsed.type === "tool-call") {
                // 处理工具调用
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.id === assistantMessageId) {
                    const parts = Array.isArray(lastMsg.content)
                      ? lastMsg.content
                      : [{ type: "text" as const, text: lastMsg.content }];
                    parts.push({
                      type: "tool-call",
                      toolCallId: parsed.toolCallId,
                      toolName: parsed.toolName,
                      args: parsed.args,
                    });
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: parts,
                    };
                  }
                  return updated;
                });
              } else if (parsed.type === "assistant-message") {
                // 处理完整的助手消息
                if (parsed.content) {
                  setMessages((prev) => {
                    const updated = [...prev];
                    const lastMsg = updated[updated.length - 1];
                    if (lastMsg && lastMsg.id === assistantMessageId) {
                      updated[updated.length - 1] = {
                        ...lastMsg,
                        content:
                          typeof parsed.content === "string"
                            ? parsed.content
                            : parsed.content,
                      };
                    }
                    return updated;
                  });
                }
              }
            } catch (e) {
              // 尝试解析 SSE 格式
              const parsed = parseSSEData(line);
              if (parsed && parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.id === assistantMessageId) {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      content: mergeMessageContent(
                        lastMsg.content,
                        String(parsed.text),
                      ),
                    };
                  }
                  return updated;
                });
              }
            }
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // 请求被取消，不处理错误
        return;
      }

      setIsLoading(false);
      setError(err instanceof Error ? err : new Error(String(err)));

      // 移除失败的助手消息
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      abortController = null;
    }
  };

  // 停止请求
  const stop = () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    setIsLoading(false);
  };

  // 处理输入变化
  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    setInput(target.value);
  };

  // 处理表单提交
  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const currentInput = input().trim();
    if (!currentInput || isLoading()) return;

    const content = currentInput;
    batch(() => {
      setInput("");
    });

    await append({
      role: "user",
      content,
    });
  };

  // 清理函数
  onCleanup(() => {
    stop();
  });

  return {
    threadId,
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    append,
    setMessages,
  };
}
