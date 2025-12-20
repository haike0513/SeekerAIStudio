/**
 * useCompletion Hook - 用于文本完成
 * 基于 Vercel AI SDK React 的 useCompletion API
 */

import {
  createSignal,
  onCleanup,
  batch,
} from "solid-js";
import type {
  CompletionRequestOptions,
  UseCompletionReturn,
} from "./types";
import {
  createMessageId,
  getHeaders,
  getBody,
  parseSSEData,
} from "./utils";

export function useCompletion(
  options: CompletionRequestOptions = {},
): UseCompletionReturn {
  const {
    api = "/api/completion",
    credentials = "same-origin",
    headers: headersOption,
    body: bodyOption,
    id: idOption,
    initialInput = "",
    initialCompletion = "",
    fetch: customFetch = fetch,
  } = options;

  // 状态
  const [id, setId] = createSignal<string>(idOption || createMessageId());
  const [completion, setCompletion] = createSignal<string>(initialCompletion);
  const [input, setInput] = createSignal<string>(initialInput);
  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [error, setError] = createSignal<Error | undefined>(undefined);

  // 当前请求的 AbortController
  let abortController: AbortController | null = null;

  // 执行完成
  const complete = async (prompt: string): Promise<void> => {
    setInput(prompt);
    setCompletion("");
    setIsLoading(true);
    setError(undefined);

    // 取消之前的请求
    if (abortController) {
      abortController.abort();
    }

    abortController = new AbortController();

    try {
      const response = await customFetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(headersOption),
        },
        credentials,
        signal: abortController.signal,
        body: JSON.stringify({
          prompt,
          ...getBody(bodyOption),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status} - ${response.statusText}`,
        );
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      let currentCompletion = "";

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

              if (parsed.type === "text-delta" || parsed.type === "content") {
                const text = parsed.textDelta || parsed.text || "";
                if (text) {
                  currentCompletion += text;
                  setCompletion(currentCompletion);
                }
              } else if (parsed.completion) {
                currentCompletion = parsed.completion;
                setCompletion(currentCompletion);
              } else if (parsed.text) {
                currentCompletion += parsed.text;
                setCompletion(currentCompletion);
              }
            } catch (e) {
              // 尝试解析 SSE 格式
              const parsed = parseSSEData(line);
              if (parsed && parsed.text) {
                currentCompletion += String(parsed.text);
                setCompletion(currentCompletion);
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

  // 重新加载
  const reload = async (): Promise<void> => {
    const currentInput = input();
    if (!currentInput.trim()) return;
    await complete(currentInput);
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

    const prompt = currentInput;
    batch(() => {
      setInput("");
    });

    await complete(prompt);
  };

  // 清理函数
  onCleanup(() => {
    stop();
  });

  return {
    id,
    completion,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    reload,
    complete,
    setCompletion,
  };
}
