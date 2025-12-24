import { createSignal, createMemo, For, Show } from "solid-js";
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
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputProvider,
  usePromptInputController,
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

  // 创建一个内部组件来处理提交逻辑
  const ChatInput = () => {
    const controller = usePromptInputController();
    
    const handleSubmit = async (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const textarea = form.querySelector("textarea");
      const input = textarea?.value.trim();
      
      // 获取附件
      const attachments = controller.attachments.files();
      
      if (!input && attachments.length === 0) return;

      // 构建消息 parts
      const parts: Array<{ type: "text" | "file"; text?: string; data?: FileUIPart }> = [];
      
      if (input) {
        parts.push({ type: "text", text: input });
      }
      
      // 将附件转换为消息 parts
      for (const file of attachments) {
        parts.push({
          type: "file",
          data: {
            type: "file",
            url: file.url,
            mediaType: file.mediaType,
            filename: file.filename,
          },
        });
      }

      try {
        await sendMessage({
          role: "user",
          parts: parts as any,
        });
        
        // 清空附件
        controller.attachments.clear();
      } catch (err) {
        console.error("发送消息失败:", err);
      }
    };

    return (
      <PromptInput
        status={status()}
        onSubmit={handleSubmit}
      />
    );
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
              {(message, index) => {
                const isUser = message.role === "user";
                const textParts = message.parts?.filter(
                  (part) => part && part.type === "text"
                ) || [];
                const fileParts = message.parts?.filter(
                  (part) => part && part.type === "file"
                ) || [];
                const textContent = textParts
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("");

                return (
                  <Message from={message.role}>
                    <MessageContent>
                      <Show when={textContent}>
                        <p class="whitespace-pre-wrap break-words">{textContent}</p>
                      </Show>
                      <Show when={fileParts.length > 0}>
                        <MessageAttachments>
                          <For each={fileParts}>
                            {(part) => {
                              if (part.type === "file" && part.data) {
                                return (
                                  <MessageAttachment data={part.data} />
                                );
                              }
                              return null;
                            }}
                          </For>
                        </MessageAttachments>
                      </Show>
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

      {/* Input Area with PromptInput */}
      <div class="border-t pt-4">
        <PromptInputProvider>
          <ChatInput />
          <Show when={isLoading()}>
            <div class="mt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => stop()}
              >
                {t("app.chat.stop")}
              </Button>
            </div>
          </Show>
        </PromptInputProvider>
      </div>
    </div>
  );
}
