import { createSignal, createMemo, For, Show } from "solid-js";
import { useChat } from "@/lib/solidjs/use-chat";
import { useI18n } from "@/lib/i18n";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";
import type { FileUIPart } from "ai";

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
  PromptInputAttachment,
  PromptInputBody,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
  PromptInputButton,
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
import { MessageSquare, Check, Globe } from "lucide-solid";

// 模型列表（示例数据，可以从配置或 API 获取）
const MODELS = [
  { id: "qwen/qwen3-vl-8b", name: "Qwen3-VL 8B", provider: "qwen", chef: "Qwen", chefSlug: "qwen", providers: ["qwen"] },
  { id: "gpt-4", name: "GPT-4", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", chef: "OpenAI", chefSlug: "openai", providers: ["openai", "azure"] },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic", chef: "Anthropic", chefSlug: "anthropic", providers: ["anthropic", "azure"] },
];

export default function AIChatPage() {
  const { t } = useI18n();
  const [selectedModel, setSelectedModel] = createSignal(MODELS[0].id);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = createSignal(false);

  // 使用 createMemo 根据模型创建 transport
  const transport = createMemo(() => new LMStudioChatTransport(selectedModel()));

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    clearError,
  } = useChat({
    transport: transport(),
  });

  const isLoading = () => status() === "streaming" || status() === "submitted";

  const currentModel = () => MODELS.find((m) => m.id === selectedModel()) || MODELS[0];

  return (
    <ConversationProvider>
      <PromptInputProvider>
        {/* 使用负 margin 抵消容器的 padding，让聊天页面全屏显示 */}
        <div class="flex flex-col h-[calc(100vh-2rem)] -mx-4 -my-4 lg:-mx-6 lg:-my-6">
          {/* Messages Area with Conversation */}
          <Conversation class="flex-1 min-h-0 overflow-y-auto">
            <ConversationContent class="max-w-3xl mx-auto w-full">
              <Show
                when={messages().length > 0}
                fallback={
                  <ConversationEmptyState
                    title={t("app.chat.empty")}
                    description="开始对话..."
                    icon={<MessageSquare size={48} class="text-muted-foreground" />}
                  />
                }
              >
                <For each={messages()}>
                  {(message) => (
                    <Message from={message.role}>
                      <MessageContent>
                        <For each={message.parts}>
                          {(part, i) => {
                            if (part.type === "text") {
                              return (
                                <MessageResponse>
                                  {part.text}
                                </MessageResponse>
                              );
                            }
                            return null;
                          }}
                        </For>
                      </MessageContent>
                    </Message>
                  )}
                </For>
                <Show when={isLoading()}>
                  <Message from="assistant">
                    <MessageContent>
                      <div class="flex items-center gap-2">
                        <div class="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <span class="text-muted-foreground text-sm">
                          {t("app.chat.thinking")}
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
          <div class="border-t bg-background">
            <div class="max-w-3xl mx-auto w-full p-4">
              {/* Error Message */}
              <Show when={error()}>
                <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                  <p class="text-sm text-destructive flex-1">{error()?.message}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearError()}
                  >
                    {t("app.chat.dismiss")}
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
        parts.push(...files.map(f => ({ type: "file", ...f })));
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
    <PromptInput
      status={props.status() === "streaming" ? "streaming" : props.status() === "submitted" ? "submitted" : "ready"}
      onSubmit={handleSubmit}
    >
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <PromptInputBody>
        <PromptInputTextarea placeholder="输入消息..." />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
          <PromptInputSpeechButton />
          <PromptInputButton>
            <Globe size={16} />
            <span>搜索</span>
          </PromptInputButton>
          <ModelSelector
            open={props.isModelSelectorOpen()}
            onOpenChange={props.setIsModelSelectorOpen}
          >
            <ModelSelectorTrigger asChild>
              <PromptInputButton>
                {currentModel().chefSlug && (
                  <ModelSelectorLogo provider={currentModel().chefSlug} />
                )}
                {currentModel().name && (
                  <ModelSelectorName>{currentModel().name}</ModelSelectorName>
                )}
              </PromptInputButton>
            </ModelSelectorTrigger>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="搜索模型..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>未找到模型</ModelSelectorEmpty>
                <For each={["OpenAI", "Anthropic", "Qwen"]}>
                  {(chef) => (
                    <ModelSelectorGroup heading={chef}>
                      <For each={MODELS.filter((m) => m.chef === chef)}>
                        {(model) => (
                          <ModelSelectorItem
                            value={model.id}
                            onSelect={() => {
                              props.setSelectedModel(model.id);
                              props.setIsModelSelectorOpen(false);
                            }}
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
        </PromptInputTools>
        <PromptInputSubmit status={props.status() === "streaming" ? "streaming" : props.status() === "submitted" ? "submitted" : "ready"} />
      </PromptInputFooter>
    </PromptInput>
  );
}
