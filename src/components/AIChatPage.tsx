import { createSignal, createMemo, For, Show } from "solid-js";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/lib/solidjs/use-chat";
import { useI18n } from "@/lib/i18n";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";
import { cn } from "@/lib/utils";
import type { UIMessage, FileUIPart } from "ai";

// AI Elements 组件
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageAttachments,
  MessageAttachment,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputProvider,
  usePromptInputController,
  Input,
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
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles } from "lucide-solid";

// 模型列表（示例数据，可以从配置或 API 获取）
const MODELS = [
  { id: "qwen/qwen3-vl-8b", name: "Qwen3-VL 8B", provider: "qwen" },
  { id: "gpt-4", name: "GPT-4", provider: "openai" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "anthropic" },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "anthropic" },
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

  const [input, setInput] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const inputValue = input().trim();
    if (!inputValue) return;

    try {
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text: inputValue }] as any,
      });
      setInput("");
    } catch (err) {
      console.error("发送消息失败:", err);
    }
  };

  const isLoading = () => status() === "streaming" || status() === "submitted";

  const currentModel = () => MODELS.find((m) => m.id === selectedModel()) || MODELS[0];

  return (
    <div class="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header with Model Selector */}
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{t("app.chat.title")}</h1>
          <p class="text-muted-foreground">{t("app.chat.description")}</p>
        </div>
        
        <ModelSelector
          open={isModelSelectorOpen()}
          onOpenChange={setIsModelSelectorOpen}
        >
          <ModelSelectorTrigger asChild>
            <Button variant="outline" class="gap-2">
              <Sparkles size={16} />
              <span>{currentModel().name}</span>
            </Button>
          </ModelSelectorTrigger>
          <ModelSelectorContent title="选择模型">
            <ModelSelectorInput placeholder="搜索模型..." />
            <ModelSelectorList>
              <ModelSelectorEmpty>未找到模型</ModelSelectorEmpty>
              <ModelSelectorGroup>
                <For each={MODELS}>
                  {(model) => (
                    <ModelSelectorItem
                      value={model.id}
                      onSelect={() => {
                        setSelectedModel(model.id);
                        setIsModelSelectorOpen(false);
                      }}
                    >
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                    </ModelSelectorItem>
                  )}
                </For>
              </ModelSelectorGroup>
            </ModelSelectorList>
          </ModelSelectorContent>
        </ModelSelector>
      </div>

      {/* Messages Area with Conversation */}
      <Conversation class="flex-1 min-h-0 mb-4">
        <ConversationContent>
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

      {/* Input Area */}
      <div class="border-t pt-4">
        <Input
          onSubmit={handleSubmit}
          class="w-full max-w-2xl mx-auto relative"
        >
          <PromptInputTextarea
            value={input()}
            placeholder="Say something..."
            onChange={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setInput(target.value);
            }}
            class="pr-12"
          />
          <PromptInputSubmit
            status={status() === "streaming" ? "streaming" : "ready"}
            disabled={!input().trim()}
            class="absolute bottom-1 right-1"
          />
        </Input>
      </div>
    </div>
  );
}
