/**
 * StreamingText - 流式文本显示组件
 * 
 * 用于显示 AI 生成的流式文本，支持打字机效果和 Markdown 渲染
 */

import { Component, createSignal, createEffect, onCleanup, Show } from "solid-js";
import { Markdown } from "../Markdown";

export interface StreamingTextProps {
    /** 完整文本内容 */
    content: string;
    /** 是否正在流式输出 */
    isStreaming?: boolean;
    /** 是否启用打字机效果 (仅在非流式时有效) */
    enableTypewriter?: boolean;
    /** 打字机速度 (ms/字符) */
    typewriterSpeed?: number;
    /** 是否渲染 Markdown */
    renderMarkdown?: boolean;
    /** 自定义类名 */
    class?: string;
    /** 显示光标 */
    showCursor?: boolean;
}

export const StreamingText: Component<StreamingTextProps> = (props) => {
    const [displayedContent, setDisplayedContent] = createSignal("");
    const [isTyping, setIsTyping] = createSignal(false);

    let typewriterInterval: number | undefined;
    let currentIndex = 0;

    // 清理定时器
    onCleanup(() => {
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
        }
    });

    // 处理内容变化
    createEffect(() => {
        const content = props.content;
        const isStreaming = props.isStreaming ?? false;
        const enableTypewriter = props.enableTypewriter ?? false;
        const speed = props.typewriterSpeed ?? 20;

        // 清理之前的定时器
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
            typewriterInterval = undefined;
        }

        if (isStreaming) {
            // 流式模式：直接显示全部内容
            setDisplayedContent(content);
            setIsTyping(true);
        } else if (enableTypewriter && content.length > displayedContent().length) {
            // 打字机模式：逐字显示
            setIsTyping(true);
            currentIndex = displayedContent().length;

            typewriterInterval = setInterval(() => {
                if (currentIndex < content.length) {
                    currentIndex++;
                    setDisplayedContent(content.slice(0, currentIndex));
                } else {
                    clearInterval(typewriterInterval);
                    typewriterInterval = undefined;
                    setIsTyping(false);
                }
            }, speed) as unknown as number;
        } else {
            // 直接显示
            setDisplayedContent(content);
            setIsTyping(false);
        }
    });

    // 当流式结束时停止打字状态
    createEffect(() => {
        if (!props.isStreaming && isTyping() && !props.enableTypewriter) {
            setIsTyping(false);
        }
    });

    return (
        <div class={`streaming-text ${props.class ?? ""}`}>
            <Show
                when={props.renderMarkdown !== false}
                fallback={
                    <pre class="whitespace-pre-wrap font-sans">
                        {displayedContent()}
                        <Show when={(props.showCursor ?? true) && (isTyping() || props.isStreaming)}>
                            <span class="streaming-cursor">▌</span>
                        </Show>
                    </pre>
                }
            >
                <div class="prose prose-invert max-w-none">
                    <Markdown content={displayedContent()} />
                    <Show when={(props.showCursor ?? true) && (isTyping() || props.isStreaming)}>
                        <span class="streaming-cursor inline-block animate-pulse ml-0.5">▌</span>
                    </Show>
                </div>
            </Show>
        </div>
    );
};

/**
 * TypingIndicator - 打字指示器
 * 
 * 显示 AI 正在输入的动画
 */
export const TypingIndicator: Component<{ class?: string }> = (props) => {
    return (
        <div class={`flex items-center gap-1 ${props.class ?? ""}`}>
            <span class="typing-dot w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style="animation-delay: 0ms" />
            <span class="typing-dot w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style="animation-delay: 150ms" />
            <span class="typing-dot w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style="animation-delay: 300ms" />
        </div>
    );
};

/**
 * StreamingStatus - 流式状态指示器
 */
export const StreamingStatus: Component<{
    status: "ready" | "streaming" | "submitted" | "error";
    class?: string;
}> = (props) => {
    const statusText = () => {
        switch (props.status) {
            case "streaming":
                return "正在生成...";
            case "submitted":
                return "正在思考...";
            case "error":
                return "生成出错";
            default:
                return "";
        }
    };

    return (
        <Show when={props.status !== "ready"}>
            <div class={`flex items-center gap-2 text-sm text-muted-foreground ${props.class ?? ""}`}>
                <Show
                    when={props.status !== "error"}
                    fallback={
                        <span class="text-destructive">{statusText()}</span>
                    }
                >
                    <TypingIndicator />
                    <span>{statusText()}</span>
                </Show>
            </div>
        </Show>
    );
};

export default StreamingText;
