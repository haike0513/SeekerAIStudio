import { createSignal, For, Show } from "solid-js";
import { useChat } from "@/lib/solidjs/use-chat";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";
import { useNovelStore } from "@/features/novel/stores/novelStore";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { Send, Sparkles } from "lucide-solid";

// A simplified Chat Panel for the Novel Copilot
export default function ChatPanel() {
  const { activeChapter } = useNovelStore();
  
  // Default to a model - hardcoded for now or reuse logic
  const transport = new LMStudioChatTransport("lmstudio:qwen/qwen3-vl-8b"); 
  
  const { messages, status, sendMessage } = useChat({
    transport,
    initialMessages: [
       {
         id: "system-1",
         role: "system",
         parts: [{ type: "text", text: "You are an expert novel writing assistant. Help the user write, edit, and brainstorm their story." }]
       }
    ],
  });

  const [input, setInput] = createSignal("");

  const handleSubmit = async () => {
    if (!input().trim() || status() === "streaming") return;

    const userQuery = input();
    setInput("");

    // Context Injection
    const chapter = activeChapter();
    let context = "";
    if (chapter) {
        context = `\n\n[Context: Current Chapter "${chapter.title}"]\n${chapter.content.slice(-2000)}`; // Limit context
    }
    
    // We send the plain text
    const fullContent = `${userQuery}${context ? `\n\nReference Material:\n${context}` : ""}`;

    await sendMessage({
      role: "user" as any,
      parts: [{ type: "text", text: fullContent }],
    });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div class="flex flex-col h-full">
      {/* Messages */}
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        <For each={messages().filter(m => (m.role as string) !== 'system')}>
          {(message) => (
            <div class={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
              <div
                class={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <For each={message.parts}>
                  {(part) => (
                     <Show when={part.type === "text"}>
                        <Markdown content={part.text} class="prose-sm dark:prose-invert" />
                     </Show>
                  )}
                </For>
              </div>
            </div>
          )}
        </For>
        <Show when={status() === "streaming"}>
            <div class="flex items-start">
               <div class="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                  <Sparkles class="h-4 w-4 animate-pulse" />
                  Thinking...
               </div>
            </div>
        </Show>
      </div>

      {/* Input */}
      <div class="p-3 border-t bg-background">
        <div class="relative">
            <Textarea 
                value={input()} 
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Copilot..."
                class="min-h-[80px] pr-12 resize-none"
            />
            <Button 
                size="icon" 
                class="absolute bottom-2 right-2 h-8 w-8"
                onClick={handleSubmit}
                disabled={!input().trim() || status() === "streaming"}
            >
                <Send class="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}
