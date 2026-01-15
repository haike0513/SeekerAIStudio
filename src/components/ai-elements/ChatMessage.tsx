/**
 * ChatMessage - 聊天消息组件
 * 
 * 显示单条聊天消息，支持用户和 AI 角色，包含头像、内容、操作按钮等
 */

import { Component, Show, createSignal } from "solid-js";
import { StreamingText } from "./StreamingText";
import { Button } from "../ui/button";
import {
    Copy,
    Check,
    RefreshCw,
    ThumbsUp,
    ThumbsDown,
    MoreHorizontal,
    User,
    Bot,
    Sparkles
} from "lucide-solid";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ChatMessage as ChatMessageType } from "@/lib/store/chat-store";

export interface ChatMessageProps {
    message: ChatMessageType;
    isStreaming?: boolean;
    onRegenerate?: () => void;
    onCopy?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
    showActions?: boolean;
}

export const ChatMessage: Component<ChatMessageProps> = (props) => {
    const [copied, setCopied] = createSignal(false);
    const [liked, setLiked] = createSignal<boolean | null>(null);

    const isUser = () => props.message.role === "user";
    const isAssistant = () => props.message.role === "assistant";
    const isSystem = () => props.message.role === "system";

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(props.message.content);
            setCopied(true);
            props.onCopy?.();
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleLike = (value: boolean) => {
        setLiked(liked() === value ? null : value);
    };

    return (
        <div
            class={`chat-message group flex gap-4 py-4 px-4 ${isUser() ? "bg-muted/30" : ""
                } ${isSystem() ? "bg-accent/10 border-l-2 border-accent" : ""}`}
            data-role={props.message.role}
        >
            {/* 头像 */}
            <div class="flex-shrink-0">
                <div
                    class={`w-8 h-8 rounded-full flex items-center justify-center ${isUser()
                            ? "bg-primary text-primary-foreground"
                            : isSystem()
                                ? "bg-accent text-accent-foreground"
                                : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                        }`}
                >
                    <Show when={isUser()} fallback={
                        <Show when={isSystem()} fallback={<Sparkles class="w-4 h-4" />}>
                            <Bot class="w-4 h-4" />
                        </Show>
                    }>
                        <User class="w-4 h-4" />
                    </Show>
                </div>
            </div>

            {/* 内容 */}
            <div class="flex-1 min-w-0 space-y-2">
                {/* 角色名称 */}
                <div class="flex items-center gap-2">
                    <span class="font-medium text-sm">
                        {isUser() ? "你" : isSystem() ? "系统" : "AI 助手"}
                    </span>
                    <Show when={props.message.metadata?.model}>
                        <span class="text-xs text-muted-foreground">
                            · {props.message.metadata?.model}
                        </span>
                    </Show>
                    <Show when={props.message.tokens}>
                        <span class="text-xs text-muted-foreground">
                            · {props.message.tokens} tokens
                        </span>
                    </Show>
                </div>

                {/* 消息内容 */}
                <div class="message-content">
                    <Show
                        when={isAssistant() && props.isStreaming}
                        fallback={
                            <StreamingText
                                content={props.message.content}
                                isStreaming={false}
                                renderMarkdown={isAssistant() || isSystem()}
                                showCursor={false}
                            />
                        }
                    >
                        <StreamingText
                            content={props.message.content}
                            isStreaming={true}
                            renderMarkdown={true}
                            showCursor={true}
                        />
                    </Show>
                </div>

                {/* 操作按钮 */}
                <Show when={props.showActions !== false && !props.isStreaming}>
                    <div
                        class={`flex items-center gap-1 mt-2 transition-opacity ${isUser()
                                ? "opacity-0 group-hover:opacity-100"
                                : "opacity-60 group-hover:opacity-100"
                            }`}
                    >
                        {/* 复制 */}
                        <Button
                            variant="ghost"
                            size="sm"
                            class="h-7 px-2"
                            onClick={handleCopy}
                        >
                            <Show when={copied()} fallback={<Copy class="w-3.5 h-3.5" />}>
                                <Check class="w-3.5 h-3.5 text-green-500" />
                            </Show>
                        </Button>

                        {/* AI 回复专用按钮 */}
                        <Show when={isAssistant()}>
                            {/* 重新生成 */}
                            <Button
                                variant="ghost"
                                size="sm"
                                class="h-7 px-2"
                                onClick={props.onRegenerate}
                            >
                                <RefreshCw class="w-3.5 h-3.5" />
                            </Button>

                            {/* 点赞/点踩 */}
                            <div class="flex items-center border-l border-border ml-1 pl-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class={`h-7 px-2 ${liked() === true ? "text-green-500" : ""}`}
                                    onClick={() => handleLike(true)}
                                >
                                    <ThumbsUp class="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    class={`h-7 px-2 ${liked() === false ? "text-red-500" : ""}`}
                                    onClick={() => handleLike(false)}
                                >
                                    <ThumbsDown class="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </Show>

                        {/* 更多操作 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger as={Button} variant="ghost" size="sm" class="h-7 px-2">
                                <MoreHorizontal class="w-3.5 h-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem onClick={handleCopy}>
                                    复制内容
                                </DropdownMenuItem>
                                <Show when={isUser()}>
                                    <DropdownMenuItem onClick={props.onEdit}>
                                        编辑消息
                                    </DropdownMenuItem>
                                </Show>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    class="text-destructive"
                                    onClick={props.onDelete}
                                >
                                    删除消息
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </Show>
            </div>
        </div>
    );
};

/**
 * ChatMessageList - 聊天消息列表
 */
export const ChatMessageList: Component<{
    messages: ChatMessageType[];
    streamingMessageId?: string;
    onRegenerate?: (messageId: string) => void;
    onDeleteMessage?: (messageId: string) => void;
    class?: string;
}> = (props) => {
    return (
        <div class={`chat-message-list divide-y divide-border/50 ${props.class ?? ""}`}>
            {props.messages.map((message) => (
                <ChatMessage
                    message={message}
                    isStreaming={message.id === props.streamingMessageId}
                    onRegenerate={() => props.onRegenerate?.(message.id)}
                    onDelete={() => props.onDeleteMessage?.(message.id)}
                />
            ))}
        </div>
    );
};

export default ChatMessage;
