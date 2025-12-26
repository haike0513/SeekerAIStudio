import { createSignal, createMemo, For, Show, createEffect } from "solid-js";
import { useParams, useNavigate, useSearchParams } from "@solidjs/router";
import { useChat } from "@/lib/solidjs/use-chat";
import { useI18n } from "@/lib/i18n";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";
import { useSessions } from "@/lib/solidjs/use-sessions";
import { ChatHistoryList } from "@/components/ChatHistoryList";
import { getRoleById, getDefaultRole } from "@/lib/ai/roles";
import type { UIMessage } from "ai";

// AI Elements 组件
import {
  Conversation,
  ConversationProvider,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputProvider,
  usePromptInputController,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
  PromptInputTextarea,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorName,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { MessageSquare, Check, Globe, Paperclip, Mic, History } from "lucide-solid";
import { Markdown } from "@/components/Markdown";

// 模型列表（示例数据，可以从配置或 API 获取）
// 使用 registry 格式: providerId:modelId
const MODELS = [
  { id: "lmstudio:qwen/qwen3-vl-8b", name: "Qwen3-VL 8B", provider: "lmstudio", chef: "Qwen", chefSlug: "qwen", providers: ["lmstudio"] },
  // 以下模型需要在 registry 中添加对应的 provider 后才能使用
  { id: "openai:gpt-4", name: "GPT-4", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "openai:gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "anthropic:claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
  { id: "anthropic:claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
];

export default function ChatSessionPage() {
  const { t } = useI18n();
  const params = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedModel, setSelectedModel] = createSignal(MODELS[0].id);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = createSignal(false);
  const [isHistoryOpen, setIsHistoryOpen] = createSignal(false);
  const [hasHandledInitialPrompt, setHasHandledInitialPrompt] = createSignal(false);

  // Session管理
  const {
    currentSessionId,
    switchToSession,
    saveSessionMessages,
    loadSessionMessages,
    sessions,
  } = useSessions();

  // 使用 createMemo 根据模型创建 transport
  const transport = createMemo(() => new LMStudioChatTransport(selectedModel()));

  // 当前session的初始消息
  const [initialMessages, setInitialMessages] = createSignal<UIMessage[]>([]);

  const {
    messages,
    status,
    error,
    sendMessage,
    clearError,
    setMessages,
  } = useChat({
    transport: transport(),
    initialMessages: initialMessages(),
  });

  // 获取当前会话的角色信息
  const currentSessionRole = createMemo(() => {
    const sessionId = currentSessionId();
    if (!sessionId) return null;
    const session = sessions().find((s) => s.id === sessionId);
    if (!session || !session.roleId) return null;
    return getRoleById(session.roleId) || null;
  });

  // 初始化或切换session时加载消息
  createEffect(() => {
    const sessionId = currentSessionId();
    if (sessionId) {
      const loadedMessages = loadSessionMessages(sessionId);
      const role = currentSessionRole();
      
      // 如果有角色，确保系统消息存在
      let messagesWithSystem: UIMessage[] = loadedMessages;
      if (role) {
        // 检查是否已有系统消息
        const hasSystemMessage = loadedMessages.some((msg) => msg.role === "system");
        if (!hasSystemMessage) {
          // 在消息列表开头添加系统消息
          messagesWithSystem = [
            {
              id: `system-${sessionId}`,
              role: "system",
              parts: [{ type: "text", text: role.systemPrompt }],
            },
            ...loadedMessages,
          ];
        }
      }
      
      setInitialMessages(messagesWithSystem);
      // 使用setMessages来更新Chat实例的消息
      setMessages(messagesWithSystem);
      
      // 如果URL中有prompt参数且消息为空，自动发送
      const prompt = Array.isArray(searchParams.prompt) ? searchParams.prompt[0] : searchParams.prompt;
      if (prompt && loadedMessages.length === 0 && !hasHandledInitialPrompt()) {
        setHasHandledInitialPrompt(true);
        // 清除URL中的prompt参数
        setSearchParams({ prompt: undefined }, { replace: true });
        // 延迟发送，确保chat实例已准备好
        setTimeout(() => {
          sendMessage({
            role: "user",
            parts: [{ type: "text", text: prompt }],
          }).catch((err) => {
            console.error("自动发送消息失败:", err);
          });
        }, 100);
      }
    } else {
      setInitialMessages([]);
      setMessages([]);
    }
  });

  // 当消息变化时保存到session
  createEffect(() => {
    const sessionId = currentSessionId();
    const msgs = messages();
    const role = currentSessionRole();
    
    if (sessionId && msgs.length > 0) {
      // 确保系统消息被包含在保存的消息中
      let messagesToSave = msgs;
      if (role) {
        const hasSystemMessage = msgs.some((msg) => msg.role === "system");
        if (!hasSystemMessage) {
          // 如果消息中没有系统消息，添加系统消息
          messagesToSave = [
            {
              id: `system-${sessionId}`,
              role: "system",
              parts: [{ type: "text", text: role.systemPrompt }],
            },
            ...msgs,
          ];
        }
      }
      
      // 延迟保存，避免频繁写入
      const timer = setTimeout(() => {
        saveSessionMessages(sessionId, messagesToSave);
      }, 500);
      return () => clearTimeout(timer);
    }
  });

  // 从URL参数同步session（这个页面只在有sessionId时才显示）
  createEffect(() => {
    const urlSessionId = params.sessionId;
    const currentId = currentSessionId();
    const allSessions = sessions();
    
    if (urlSessionId) {
      // 检查是否存在该session
      const session = allSessions.find((s) => s.id === urlSessionId);
      if (session) {
        // Session存在，如果当前sessionId不同，则切换
        if (currentId !== urlSessionId) {
          switchToSession(urlSessionId);
        }
      } else {
        // URL中的session不存在，重定向到首页
        navigate("/chat", { replace: true });
      }
    }
  });

  // 处理session切换
  const handleSessionSelect = (sessionId: string, _session: any) => {
    switchToSession(sessionId);
    navigate(`/chat/${sessionId}`);
    setIsHistoryOpen(false);
  };

  // 处理新建session - 跳转到首页
  const handleNewSession = () => {
    navigate("/chat");
    setIsHistoryOpen(false);
  };

  const isLoading = () => status() === "streaming" || status() === "submitted";

  return (
    <ConversationProvider>
      <PromptInputProvider>
        {/* 使用负 margin 抵消容器的 padding，让聊天页面全屏显示 */}
        <div class="flex flex-col h-[calc(100vh-2rem)] -mx-4 -my-4 lg:-mx-6 lg:-my-6 relative">
          {/* 历史列表侧边栏 - 相对于main内容区域悬浮 */}
          <Show when={isHistoryOpen()}>
            <div class="absolute left-4 top-4 bottom-4 w-64 bg-card border border-border rounded-lg shadow-lg z-50">
              <ChatHistoryList
                currentSessionId={currentSessionId}
                onSessionSelect={handleSessionSelect}
                onNewSession={handleNewSession}
                showCollapseButton={true}
                onCollapse={() => setIsHistoryOpen(false)}
              />
            </div>
          </Show>
          
          {/* 历史按钮 - 仅在历史列表关闭时显示 */}
          <Show when={!isHistoryOpen()}>
            <div class="absolute top-4 left-4 z-40">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsHistoryOpen(true)}
                class="shadow-sm"
              >
                <History size={18} />
              </Button>
            </div>
          </Show>
          
          {/* 主内容区域 */}
          <div class="flex-1 flex flex-col">

          {/* Messages Area with Conversation */}
          <Conversation class="flex-1 min-h-0 overflow-y-auto bg-gradient-to-b from-background via-background to-background/95">
            <ConversationContent class="max-w-3xl mx-auto w-full px-4 py-6">
              <Show
                when={messages().length > 0}
                fallback={
                  <ConversationEmptyState
                    title={t("app.settings.chat.empty")}
                    description="开始对话..."
                    icon={<MessageSquare size={48} class="text-muted-foreground" />}
                  />
                }
              >
                <For each={messages()}>
                  {(message) => {
                    const isUser = message.role === "user";
                    return (
                      <Message from={message.role}>
                        <MessageContent>
                          <For each={message.parts}>
                            {(part) => {
                              if (part.type === "text") {
                                return (
                                  <MessageResponse>
                                    <Show
                                      when={!isUser}
                                      fallback={<span class="whitespace-pre-wrap break-words">{part.text}</span>}
                                    >
                                      <Markdown content={part.text} />
                                    </Show>
                                  </MessageResponse>
                                );
                              }
                              return null;
                            }}
                          </For>
                        </MessageContent>
                      </Message>
                    );
                  }}
                </For>
                <Show when={isLoading()}>
                  <Message from="assistant">
                    <MessageContent>
                      <div class="flex items-center gap-2">
                        <div class="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span class="text-muted-foreground text-sm">
                          {t("app.settings.chat.thinking")}
                        </span>
                      </div>
                    </MessageContent>
                  </Message>
                </Show>
              </Show>
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input Area - 固定在底部 */}
          <div class="bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div class="max-w-3xl mx-auto w-full px-4 pt-4 pb-6">
              {/* Error Message */}
              <Show when={error()}>
                <div class="mb-3 p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 shadow-sm">
                  <p class="text-sm text-destructive flex-1">{error()?.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearError()}
                    class="h-7 px-2"
                  >
                    {t("app.settings.chat.dismiss")}
                  </Button>
                </div>
              </Show>
              
              <PromptInputWrapper
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                isModelSelectorOpen={isModelSelectorOpen}
                setIsModelSelectorOpen={setIsModelSelectorOpen}
                status={status}
                sendMessage={sendMessage}
              />
            </div>
          </div>
          </div>
        </div>
      </PromptInputProvider>
    </ConversationProvider>
  );
}

// 内部组件，用于访问 PromptInputController
function PromptInputWrapper(props: {
  selectedModel: () => string;
  setSelectedModel: (id: string) => void;
  isModelSelectorOpen: () => boolean;
  setIsModelSelectorOpen: (open: boolean) => void;
  status: () => "streaming" | "submitted" | "ready" | "error";
  sendMessage: (message: { role: "user"; parts: any[] }) => Promise<void>;
}) {
  const controller = usePromptInputController();
  const currentModel = () => MODELS.find((m) => m.id === props.selectedModel()) || MODELS[0];

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const text = controller.textInput.value().trim();
    const files = controller.attachments.files();
    
    const hasText = Boolean(text);
    const hasAttachments = Boolean(files.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    try {
      const parts: any[] = [];
      if (hasText) {
        parts.push({ type: "text", text });
      }
      if (hasAttachments) {
        parts.push(...files.map(f => ({ ...f })));
      }
      
      await props.sendMessage({
        role: "user",
        parts,
      });
      
      controller.textInput.clear();
      controller.attachments.clear();
    } catch (err) {
      console.error("发送消息失败:", err);
    }
  };

  return (
    <div class="relative">
      <PromptInput
        status={props.status() === "streaming" ? "streaming" : props.status() === "submitted" ? "submitted" : "ready"}
        onSubmit={handleSubmit}
        class="group"
      >
        <PromptInputAttachments />
        
        {/* 统一的输入容器 */}
        <div class="relative flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/80 backdrop-blur-sm shadow-sm shadow-black/5 transition-all duration-300 focus-within:border-primary/60 focus-within:shadow-md focus-within:shadow-primary/10 focus-within:bg-background">
          <PromptInputBody class="px-4 pt-4 pb-2">
            <PromptInputTextarea 
              placeholder="输入消息..." 
              class="min-h-[60px] border-0 px-0 py-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
            />
          </PromptInputBody>
          
          {/* 底部工具栏 - 与输入框一体化 */}
          <div class="flex items-center justify-between gap-2 px-4 pb-3 pt-2.5">
            <div class="flex items-center gap-1">
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  >
                    <Paperclip size={16} class="shrink-0" />
                  </Button>
                </PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              
              <PromptInputSpeechButton class="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors">
                <Mic size={16} class="shrink-0" />
              </PromptInputSpeechButton>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 gap-1.5 transition-colors"
              >
                <Globe size={14} class="shrink-0" />
                <span class="text-xs font-medium">搜索</span>
              </Button>
              
              <ModelSelector
                open={props.isModelSelectorOpen()}
                onOpenChange={props.setIsModelSelectorOpen}
              >
                <ModelSelectorTrigger
                  type="button"
                  class="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/60 gap-1.5 rounded-md text-xs font-medium inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  {currentModel().chefSlug && (
                    <ModelSelectorLogo provider={currentModel().chefSlug} />
                  )}
                  {currentModel().name && (
                    <span class="text-xs font-medium">{currentModel().name}</span>
                  )}
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="搜索模型..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>未找到模型</ModelSelectorEmpty>
                    <For each={["OpenAI", "Anthropic", "Qwen"]}>
                      {(chef) => (
                        <ModelSelectorGroup>
                          <div class="cmdk-group-heading">{chef}</div>
                          <For each={MODELS.filter((m) => m.chef === chef)}>
                            {(model) => (
                              <ModelSelectorItem
                                onClick={() => {
                                  props.setSelectedModel(model.id);
                                  props.setIsModelSelectorOpen(false);
                                }}
                                class="cursor-pointer"
                              >
                                <ModelSelectorLogo provider={model.chefSlug} />
                                <ModelSelectorName>{model.name}</ModelSelectorName>
                                <ModelSelectorLogoGroup>
                                  <For each={model.providers}>
                                    {(provider) => (
                                      <ModelSelectorLogo provider={provider} />
                                    )}
                                  </For>
                                </ModelSelectorLogoGroup>
                                {props.selectedModel() === model.id ? (
                                  <Check class="ml-auto size-4" />
                                ) : (
                                  <div class="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            )}
                          </For>
                        </ModelSelectorGroup>
                      )}
                    </For>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </div>
            
            <PromptInputSubmit 
              status={props.status() === "streaming" ? "streaming" : props.status() === "submitted" ? "submitted" : "ready"}
              class="h-8 w-8 p-0 shrink-0 shadow-sm hover:shadow-md transition-shadow"
            />
          </div>
        </div>
      </PromptInput>
    </div>
  );
}
