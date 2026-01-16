/**
 * 增强版聊天会话页面
 * 
 * 集成新的 Store 系统，支持：
 * - 消息持久化
 * - 流式显示
 * - 模型切换
 * - 消息操作（复制、重新生成等）
 */

import { Component, createSignal, createEffect, Show, For, onMount } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import {
    Trash2,
    PanelLeftClose,
    PanelLeft,
    Sparkles
} from "lucide-solid";
import { useI18n } from "@/lib/i18n";

// Store
import {
    deleteSession,
    setActiveSession,
    getSortedSessions,
} from "@/lib/store";

// AI
import { useChatSession, type ChatStatus } from "@/lib/ai";
import { getAllAvailableModels, modelStore } from "@/lib/store";

// Components
import { ChatMessage as ChatMessageComponent } from "@/components/ai-elements/ChatMessage";
import { StreamingStatus } from "@/components/ai-elements/StreamingText";
import {
    PromptInput,
    PromptInputProvider,
    usePromptInputController,
    PromptInputBody,
    PromptInputTextarea,
    PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { ChatHistoryList } from "@/components/ChatHistoryList";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ============ 主组件 ============

const EnhancedChatPage: Component = () => {
    const params = useParams<{ sessionId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    // 使用 useI18n 但目前未使用 t，保留以备将来国际化
    useI18n();

    // 状态
    const [showHistory, setShowHistory] = createSignal(false);
    const [selectedModelId, setSelectedModelId] = createSignal(
        modelStore.state.defaultProviderId + ":" + modelStore.state.defaultModelId
    );

    // 获取或创建会话
    const sessionId = () => params.sessionId;

    // 使用增强的聊天 Hook
    const chat = useChatSession({
        sessionId: sessionId(),
        modelId: selectedModelId(),
        onFinish: (response) => {
            console.log("Chat finished:", response);
        },
        onError: (error) => {
            console.error("Chat error:", error);
        },
    });

    // 消息容器引用
    let messagesContainerRef: HTMLDivElement | undefined;

    // 初始加载
    onMount(() => {
        // 设置当前活动会话
        setActiveSession(sessionId());

        // 检查是否有初始提示词（从首页跳转）
        const initialPrompt = searchParams.prompt;
        if (initialPrompt && typeof initialPrompt === "string") {
            chat.sendMessage(initialPrompt);
            // 清除 URL 中的 prompt 参数
            navigate(`/chat/${sessionId()}`, { replace: true });
        }
    });

    // 自动滚动到底部
    createEffect(() => {
        const messages = chat.messages();
        if (messages.length > 0 && messagesContainerRef) {
            messagesContainerRef.scrollTop = messagesContainerRef.scrollHeight;
        }
    });

    // 处理会话切换
    const handleSessionSelect = (newSessionId: string) => {
        navigate(`/chat/${newSessionId}`);
        setShowHistory(false);
    };

    // 处理新建会话
    const handleNewSession = () => {
        navigate("/chat");
        setShowHistory(false);
    };

    // 处理删除会话
    const handleDeleteSession = () => {
        if (confirm("确定要删除这个会话吗？")) {
            deleteSession(sessionId());
            const remainingSessions = getSortedSessions();
            if (remainingSessions.length > 0) {
                navigate(`/chat/${remainingSessions[0].id}`);
            } else {
                navigate("/chat");
            }
        }
    };

    // 处理清空消息
    const handleClearMessages = () => {
        if (confirm("确定要清空所有消息吗？")) {
            chat.clearMessages();
        }
    };

    // 可用模型列表
    const availableModels = () => getAllAvailableModels();

    return (
        <PromptInputProvider>
            <div class="flex h-[calc(100vh-2rem)] -mx-4 -my-4 lg:-mx-6 lg:-my-6">
                <Show when={showHistory()}>
                    <div class="w-72 border-r border-border bg-muted/30 shrink-0">
                        <ChatHistoryList
                            currentSessionId={() => sessionId()}
                            onSessionSelect={handleSessionSelect}
                            onNewSession={handleNewSession}
                            showCollapseButton={true}
                            onCollapse={() => setShowHistory(false)}
                        />
                    </div>
                </Show>

                {/* 主内容区 */}
                <div class="flex-1 flex flex-col min-w-0">
                    {/* 顶部工具栏 */}
                    <header class="h-14 border-b border-border flex items-center justify-between px-4 bg-background/95 backdrop-blur">
                        <div class="flex items-center gap-3">
                            {/* 切换历史面板 */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHistory(!showHistory())}
                            >
                                <Show when={showHistory()} fallback={<PanelLeft class="w-5 h-5" />}>
                                    <PanelLeftClose class="w-5 h-5" />
                                </Show>
                            </Button>

                            {/* 会话标题 */}
                            <div class="flex items-center gap-2">
                                <Sparkles class="w-5 h-5 text-primary" />
                                <span class="font-medium truncate max-w-[200px]">
                                    {chat.session()?.title || "新对话"}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center gap-2">
                            {/* 模型选择器 */}
                            <Select
                                options={availableModels()}
                                value={selectedModelId()}
                                onChange={(value) => {
                                    if (value) {
                                        const modelId = typeof value === 'object' && 'fullId' in value
                                            ? (value as any).fullId
                                            : String(value);
                                        setSelectedModelId(modelId);
                                    }
                                }}
                                optionValue={"fullId" as any}
                                optionTextValue={"model.name" as any}
                                placeholder="选择模型"
                                itemComponent={(props) => {
                                    const item = props.item.rawValue as ReturnType<typeof getAllAvailableModels>[0];
                                    return (
                                        <SelectItem item={props.item}>
                                            <div class="flex flex-col">
                                                <span class="font-medium">{item.model.name}</span>
                                                <span class="text-xs text-muted-foreground">{item.providerName}</span>
                                            </div>
                                        </SelectItem>
                                    );
                                }}
                            >
                                <SelectTrigger class="w-[180px]">
                                    <SelectValue<ReturnType<typeof getAllAvailableModels>[0]>>
                                        {() => {
                                            const selected = availableModels().find(m => m.fullId === selectedModelId());
                                            return selected ? (
                                                <span class="truncate">{selected.model.name}</span>
                                            ) : (
                                                <span class="text-muted-foreground">选择模型</span>
                                            );
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent />
                            </Select>

                            {/* 清空消息 */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleClearMessages}
                                disabled={chat.messages().length === 0}
                            >
                                <Trash2 class="w-4 h-4" />
                            </Button>
                        </div>
                    </header>

                    {/* 消息区域 */}
                    <div
                        ref={messagesContainerRef}
                        class="flex-1 overflow-y-auto"
                    >
                        <Show
                            when={chat.messages().length > 0}
                            fallback={
                                <div class="h-full flex items-center justify-center">
                                    <div class="text-center text-muted-foreground">
                                        <Sparkles class="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p class="text-lg">开始新的对话</p>
                                        <p class="text-sm mt-1">输入消息开始与 AI 交流</p>
                                    </div>
                                </div>
                            }
                        >
                            <div class="max-w-4xl mx-auto">
                                <For each={chat.messages()}>
                                    {(message) => (
                                        <ChatMessageComponent
                                            message={message}
                                            isStreaming={message.id === chat.streamingMessageId()}
                                            onRegenerate={() => chat.regenerate()}
                                            onDelete={() => {
                                                // TODO: 实现单条消息删除
                                            }}
                                        />
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>

                    {/* 状态指示 */}
                    <Show when={chat.status() !== "ready"}>
                        <div class="px-4 py-2 border-t border-border">
                            <StreamingStatus status={chat.status()} class="justify-center" />
                        </div>
                    </Show>

                    {/* 输入区域 */}
                    <ChatInputArea
                        status={chat.status}
                        onSend={chat.sendMessage}
                        onStop={chat.stop}
                    />
                </div>
            </div>
        </PromptInputProvider>
    );
};

// ============ 输入区域组件 ============

interface ChatInputAreaProps {
    status: () => ChatStatus;
    onSend: (message: string) => Promise<void>;
    onStop: () => void;
}

const ChatInputArea: Component<ChatInputAreaProps> = (props) => {
    const controller = usePromptInputController();

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const text = controller.textInput.value().trim();
        if (!text) return;
        if (props.status() === "streaming" || props.status() === "submitted") return;

        await props.onSend(text);
        controller.textInput.clear();
    };

    const isLoading = () => props.status() === "streaming" || props.status() === "submitted";

    return (
        <div class="border-t border-border bg-background/95 backdrop-blur">
            <div class="max-w-4xl mx-auto px-4 py-4">
                <PromptInput
                    status={isLoading() ? "streaming" : "ready"}
                    onSubmit={handleSubmit}
                >
                    <div class="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm transition-all duration-300 focus-within:border-primary/60 focus-within:shadow-md">
                        <PromptInputBody class="px-4 pt-4 pb-2">
                            <PromptInputTextarea
                                placeholder="输入消息..."
                                class="min-h-[60px] border-0 px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                                disabled={isLoading()}
                            />
                        </PromptInputBody>

                        <div class="flex items-center justify-between gap-2 px-4 pb-3">
                            <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                <kbd class="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                                <span>发送</span>
                                <kbd class="px-1.5 py-0.5 bg-muted rounded text-[10px]">Shift+Enter</kbd>
                                <span>换行</span>
                            </div>

                            <Show
                                when={!isLoading()}
                                fallback={
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            props.onStop();
                                        }}
                                    >
                                        停止
                                    </Button>
                                }
                            >
                                <PromptInputSubmit
                                    status="ready"
                                    class="h-8 w-8 p-0 shrink-0"
                                />
                            </Show>
                        </div>
                    </div>
                </PromptInput>
            </div>
        </div>
    );
};

export default EnhancedChatPage;
