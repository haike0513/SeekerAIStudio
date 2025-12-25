import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { streamText } from "ai";
import { registry } from "../registry";
import { normalizeModelId } from "../utils";

/**
 * 自定义 ChatTransport，使用 registry 来获取模型
 * 支持 providerId:modelId 格式，例如: 'lmstudio:qwen/qwen3-vl-8b'
 * 如果只提供 modelId，默认使用 'lmstudio' 作为 provider
 * 
 * 无需通过 HTTP API，直接在前端调用 streamText
 */
export class LMStudioChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private modelId: string;

  /**
   * @param modelId - 模型 ID，支持格式:
   *   - 'lmstudio:qwen/qwen3-vl-8b' (完整格式: providerId:modelId)
   *   - 'qwen/qwen3-vl-8b' (简化格式，默认使用 lmstudio provider)
   */
  constructor(modelId: string = "lmstudio:qwen/qwen3-vl-8b") {
    this.modelId = modelId;
  }

  async sendMessages(options: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UI_MESSAGE[];
    abortSignal: AbortSignal | undefined;
  }): Promise<ReadableStream<UIMessageChunk>> {
    // 将 UIMessage 转换为 streamText 需要的格式
    const modelMessages = options.messages.map((msg) => {
      const textContent =
        (msg.parts ?? [])
          .filter((part) => part && part.type === "text")
          .map((part) =>
            part && part.type === "text" && typeof part.text === "string"
              ? part.text
              : "",
          )
          .join("") || "";

      return {
        role: msg.role as "user" | "assistant" | "system",
        content: textContent,
      };
    });

    // 使用 registry 获取模型
    // 规范化模型 ID，确保使用 providerId:modelId 格式
    const fullModelId = normalizeModelId(this.modelId, "lmstudio") as `lmstudio:${string}`;
    const model = registry.languageModel(fullModelId);

    // 使用 streamText 调用模型
    const result = await streamText({
      model,
      messages: modelMessages,
      maxRetries: 1,
      abortSignal: options.abortSignal,
    });

    // 将 streamText 的结果转换为 UIMessageChunk 流
    const uiMessageStreamResponse = await result.toUIMessageStreamResponse();

    if (!uiMessageStreamResponse.body) {
      throw new Error("Response body is null");
    }

    // 解析 SSE 格式的流并转换为 UIMessageChunk
    const reader = uiMessageStreamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    return new ReadableStream<UIMessageChunk>({
      async pull(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // 处理剩余的 buffer
              if (buffer.trim()) {
                const lines = buffer.split("\n\n");
                for (const line of lines) {
                  if (line && line.trim() && line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data && data !== "[DONE]") {
                      try {
                        const chunk = JSON.parse(data) as UIMessageChunk;
                        controller.enqueue(chunk);
                      } catch (e) {
                        // 忽略解析错误
                      }
                    }
                  }
                }
              }
              controller.close();
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line && line.trim()) {
                // 处理 SSE 格式: data: {...}
                if (line.startsWith("data: ")) {
                  const data = line.slice(6).trim();
                  if (data && data !== "[DONE]") {
                    try {
                      const chunk = JSON.parse(data) as UIMessageChunk;
                      controller.enqueue(chunk);
                    } catch (e) {
                      // 忽略解析错误，继续处理下一行
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          controller.error(error);
        }
      },
      cancel() {
        reader.cancel();
      },
    });
  }

  async reconnectToStream(_options: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    // LMStudio 不支持重新连接流，返回 null
    return null;
  }
}

