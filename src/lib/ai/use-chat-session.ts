/**
 * useChatSession Hook
 * 
 * 增强版的聊天 Hook，集成 Store 系统实现消息持久化
 */

import { createSignal, createEffect, onCleanup, Accessor } from "solid-js";
import { streamText } from "ai";
import {
    chatStore,
    addMessage,
    updateMessage,
    getSessionMessages,
    getSession,
    autoGenerateTitle,
    recordRecentModel,
    type ChatMessage,
    type ChatSession,
} from "@/lib/store";
import { getLanguageModel } from "./provider-factory";

// ============ 类型定义 ============

export type ChatStatus = "ready" | "streaming" | "submitted" | "error";

export interface UseChatSessionOptions {
    /** 会话 ID */
    sessionId: string;
    /** 模型 ID (格式: providerId:modelId) */
    modelId?: string;
    /** 系统提示词 */
    systemPrompt?: string;
    /** 是否自动滚动到底部 */
    autoScroll?: boolean;
    /** 流式输出节流间隔 (ms) */
    throttleMs?: number;
    /** 完成回调 */
    onFinish?: (response: { text: string; usage?: { inputTokens: number; outputTokens: number } }) => void;
    /** 错误回调 */
    onError?: (error: Error) => void;
}

export interface UseChatSessionReturn {
    /** 消息列表 */
    messages: Accessor<ChatMessage[]>;
    /** 当前状态 */
    status: Accessor<ChatStatus>;
    /** 错误信息 */
    error: Accessor<Error | undefined>;
    /** 正在流式输出的消息 ID */
    streamingMessageId: Accessor<string | undefined>;
    /** 发送消息 */
    sendMessage: (content: string) => Promise<void>;
    /** 重新生成最后一条回复 */
    regenerate: () => Promise<void>;
    /** 停止生成 */
    stop: () => void;
    /** 清空消息 */
    clearMessages: () => void;
    /** 当前会话 */
    session: Accessor<ChatSession | undefined>;
}

// ============ Hook 实现 ============

export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
    const [messages, setMessages] = createSignal<ChatMessage[]>([]);
    const [status, setStatus] = createSignal<ChatStatus>("ready");
    const [error, setError] = createSignal<Error | undefined>();
    const [streamingMessageId, setStreamingMessageId] = createSignal<string | undefined>();
    const [session, setSession] = createSignal<ChatSession | undefined>();

    // AbortController for cancellation
    let abortController: AbortController | null = null;

    // 加载会话消息
    createEffect(() => {
        const sessionId = options.sessionId;
        if (sessionId) {
            const sessionMessages = getSessionMessages(sessionId);
            setMessages(sessionMessages);
            setSession(getSession(sessionId));
        }
    });

    // 清理
    onCleanup(() => {
        if (abortController) {
            abortController.abort();
        }
    });

    /**
     * 发送消息
     */
    async function sendMessage(content: string): Promise<void> {
        if (!content.trim()) return;
        if (status() === "streaming" || status() === "submitted") return;

        const sessionId = options.sessionId;
        const currentSession = getSession(sessionId);
        const modelId = options.modelId || currentSession?.modelId || "openai:gpt-4o";

        setError(undefined);
        setStatus("submitted");

        try {
            // 添加用户消息
            addMessage(sessionId, {
                role: "user",
                content: content.trim(),
                status: "complete",
            });

            // 更新本地消息列表
            setMessages(getSessionMessages(sessionId));

            // 获取模型
            const model = getLanguageModel(modelId);
            if (!model) {
                throw new Error(`模型 "${modelId}" 不可用`);
            }

            // 记录使用的模型
            const [providerId, ...rest] = modelId.split(":");
            recordRecentModel(providerId, rest.join(":"));

            // 准备消息历史
            const historyMessages = getSessionMessages(sessionId).map((m) => ({
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
            }));

            // 添加系统提示
            if (options.systemPrompt || currentSession?.systemPrompt) {
                historyMessages.unshift({
                    role: "system",
                    content: options.systemPrompt || currentSession?.systemPrompt || "",
                });
            }

            // 创建 AI 响应消息占位
            const assistantMessageId = addMessage(sessionId, {
                role: "assistant",
                content: "",
                status: "streaming",
                metadata: { model: modelId },
            });

            setStreamingMessageId(assistantMessageId);
            setStatus("streaming");
            setMessages(getSessionMessages(sessionId));

            // 创建 AbortController
            abortController = new AbortController();

            // 流式生成
            let fullText = "";

            const result = await streamText({
                model,
                messages: historyMessages,
                abortSignal: abortController.signal,
                onChunk: ({ chunk }) => {
                    if (chunk.type === "text-delta") {
                        // AI SDK v4 使用 text 属性，v3 使用 textDelta
                        const text = (chunk as any).text || (chunk as any).textDelta || "";
                        fullText += text;

                        // 节流更新 UI
                        updateMessage(sessionId, assistantMessageId, {
                            content: fullText,
                        });
                        setMessages(getSessionMessages(sessionId));
                    }
                },
            });

            // 等待完成
            const finalText = await result.text;
            const usage = await result.usage;

            // 更新最终消息
            updateMessage(sessionId, assistantMessageId, {
                content: finalText,
                status: "complete",
                tokens: usage?.totalTokens,
                metadata: {
                    model: modelId,
                    finishReason: await result.finishReason,
                },
            });

            // 自动生成标题 (如果是第一条消息)
            const allMessages = getSessionMessages(sessionId);
            if (allMessages.length <= 2) {
                autoGenerateTitle(sessionId);
            }

            setStreamingMessageId(undefined);
            setStatus("ready");
            setMessages(getSessionMessages(sessionId));

            // 回调
            options.onFinish?.({
                text: finalText,
                usage: usage ? {
                    inputTokens: (usage as any).promptTokens ?? (usage as any).inputTokens ?? 0,
                    outputTokens: (usage as any).completionTokens ?? (usage as any).outputTokens ?? 0,
                } : undefined,
            });

        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));

            // 检查是否是用户取消
            if (error.name === "AbortError") {
                setStatus("ready");
                return;
            }

            setError(error);
            setStatus("error");
            options.onError?.(error);

            // 更新消息状态
            const currentStreamingId = streamingMessageId();
            if (currentStreamingId) {
                updateMessage(sessionId, currentStreamingId, {
                    status: "error",
                });
                setMessages(getSessionMessages(sessionId));
            }
        } finally {
            abortController = null;
            setStreamingMessageId(undefined);
        }
    }

    /**
     * 重新生成最后一条回复
     */
    async function regenerate(): Promise<void> {
        const sessionId = options.sessionId;
        const allMessages = getSessionMessages(sessionId);

        // 找到最后一条用户消息
        const lastUserMessage = [...allMessages].reverse().find((m) => m.role === "user");
        if (!lastUserMessage) return;

        // 重新发送最后一条用户消息
        await sendMessage(lastUserMessage.content);
    }

    /**
     * 停止生成
     */
    function stop(): void {
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        setStatus("ready");
        setStreamingMessageId(undefined);
    }

    /**
     * 清空消息
     */
    function clearMessages(): void {
        const sessionId = options.sessionId;
        chatStore.clearSessionMessages?.(sessionId);
        setMessages([]);
    }

    return {
        messages,
        status,
        error,
        streamingMessageId,
        sendMessage,
        regenerate,
        stop,
        clearMessages,
        session,
    };
}

export default useChatSession;
