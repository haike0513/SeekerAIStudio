import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import { streamText } from "ai";
import { lmstudio } from "../provider/lmstudio";

/**
 * 自定义 ChatTransport，直接使用 lmstudio provider
 * 无需通过 HTTP API，直接在前端调用 streamText
 */
export class LMStudioChatTransport<UI_MESSAGE extends UIMessage>
  implements ChatTransport<UI_MESSAGE>
{
  private modelName: string;

  constructor(modelName: string = "qwen/qwen3-vl-8b") {
    this.modelName = modelName;
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
        msg.parts
          ?.filter((part) => part && part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("") || "";

      return {
        role: msg.role as "user" | "assistant" | "system",
        content: textContent,
      };
    });

    // 使用 streamText 调用 lmstudio provider
    const result = await streamText({
      model: lmstudio(this.modelName) as any,
      messages: modelMessages,
      maxRetries: 1,
      abortSignal: options.abortSignal,
    });

    // 将 streamText 的结果转换为 UIMessageChunk 流
    const uiMessageStreamResponse = await result.toUIMessageStreamResponse();

    // 返回 Response 的 body 流，它已经是 UIMessageChunk 流
    // toUIMessageStreamResponse() 返回的 Response body 实际上是 UIMessageChunk 流
    return uiMessageStreamResponse.body as unknown as ReadableStream<UIMessageChunk>;
  }

  async reconnectToStream(_options: {
    chatId: string;
  }): Promise<ReadableStream<UIMessageChunk> | null> {
    // LMStudio 不支持重新连接流，返回 null
    return null;
  }
}

