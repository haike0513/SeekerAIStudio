import { createSignal, For, Show } from "solid-js";
import { useChat } from "@/lib/solidjs/use-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { Send, Loader2, AlertCircle } from "lucide-solid";
import { cn } from "@/lib/utils";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";

export default function AIChatPage() {
  const { t } = useI18n();
  const [input, setInput] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  const {
    messages,
    status,
    error,
    sendMessage,
    stop,
    clearError,
  } = useChat({
    transport: new LMStudioChatTransport("qwen/qwen3-vl-8b"),
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const text = input().trim();
    if (!text || isSubmitting()) return;

    setIsSubmitting(true);
    setInput("");

    try {
      await sendMessage({
        role: "user",
        parts: [{ type: "text", text }],
      });
    } catch (err) {
      console.error("发送消息失败:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isLoading = () => status() === "streaming" || status() === "submitted";

  return (
    <div class="flex flex-col h-full max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div class="mb-4">
        <h1 class="text-3xl font-bold">{t("app.chat.title")}</h1>
        <p class="text-muted-foreground">{t("app.chat.description")}</p>
      </div>

      {/* Messages Area */}
      <Card class="flex-1 flex flex-col min-h-0 mb-4">
        <CardContent class="flex-1 overflow-y-auto p-4 space-y-4">
          <Show
            when={messages().length > 0}
            fallback={
              <div class="flex items-center justify-center h-full text-muted-foreground">
                <p>{t("app.chat.empty")}</p>
              </div>
            }
          >
            <For each={messages()}>
              {(message) => {
                const isUser = message.role === "user";
                const textContent = message.parts
                  ?.filter((part) => part && part.type === "text")
                  .map((part) => (part.type === "text" ? part.text : ""))
                  .join("") || "";

                return (
                  <div
                    class={cn(
                      "flex gap-3",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      class={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        isUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p class="whitespace-pre-wrap break-words">{textContent}</p>
                    </div>
                  </div>
                );
              }}
            </For>
            <Show when={isLoading()}>
              <div class="flex gap-3 justify-start">
                <div class="max-w-[80%] rounded-lg px-4 py-2 bg-muted">
                  <div class="flex items-center gap-2">
                    <Loader2 class="h-4 w-4 animate-spin" />
                    <span class="text-muted-foreground">
                      {t("app.chat.thinking")}
                    </span>
                  </div>
                </div>
              </div>
            </Show>
          </Show>
        </CardContent>
      </Card>

      {/* Error Message */}
      <Show when={error()}>
        <div class="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
          <AlertCircle class="h-4 w-4 text-destructive" />
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
      <form onSubmit={handleSubmit} class="flex gap-2">
        <Textarea
          value={input()}
          onInput={(e) => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("app.chat.placeholder")}
          disabled={isSubmitting()}
          class="flex-1 min-h-[80px] max-h-[200px] resize-none"
          rows={3}
        />
        <div class="flex flex-col gap-2">
          <Button
            type="submit"
            disabled={!input().trim() || isSubmitting()}
            size="icon"
            class="h-10 w-10"
            // onClick={handleSubmit}
          >
            <Show when={isSubmitting()} fallback={<Send class="h-4 w-4" />}>
              <Loader2 class="h-4 w-4 animate-spin" />
            </Show>
          </Button>
          <Show when={isLoading()}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => stop()}
              class="h-10"
            >
              {t("app.chat.stop")}
            </Button>
          </Show>
        </div>
      </form>
    </div>
  );
}

