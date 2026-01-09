import { Component, Show, createSignal, createEffect } from "solid-js";
import { useNovelStore } from "../../stores/novelStore";
import { Textarea } from "../../../../components/ui/textarea"; 
import { Button } from "../../../../components/ui/button";
import { Sparkles, Download } from "lucide-solid";
import { useChat } from "@/lib/solidjs/use-chat";
import { LMStudioChatTransport } from "@/lib/ai/transport/lmstudio-transport";

const SimpleEditor: Component<{ class?: string }> = (props) => {
  const { activeChapter, updateChapterContent, updateChapterTitle } = useNovelStore();
  const [isGenerating, setIsGenerating] = createSignal(false);

  // Hidden chat for text generation
  const transport = new LMStudioChatTransport("lmstudio:qwen/qwen3-vl-8b");
  const { sendMessage, messages, status } = useChat({
    transport,
    initialMessages: [
         {
             id: "system-writer", 
             role: "system", 
             parts: [{ type: "text", text: "You are a creative novel co-author. Your task is to continue the story from the provided text. Maintain the tone, style, and flow. Output ONLY the continuation text. Do not repeat the input." }]
         }
    ]
  });

  // Watch for generation output and append it
  createEffect(() => {
    if (status() === "streaming" || status() === "submitted") {
        setIsGenerating(true);
    } else {
        setIsGenerating(false);
    }
  });

  // Since tracking delta from useChat is hard without internal access,
  // We will do a simpler trick: 
  // We won't use createEffect for streaming *into* the textarea. 
  // We will simply display a "Streaming..." indicator, and when it finishes, we append.
  // OR better: We use the fact that `messages()` updates.
  // We'll hold a ref to the "generated text so far".
  
  let lastAppendedLength = 0;
  
  createEffect(() => {
      const msgs = messages();
      if (msgs.length === 0) return;
      
      const lastMsg = msgs[msgs.length - 1];
      if ((lastMsg.role as any) === "assistant" && status() === "streaming") {
          const fullText = lastMsg.parts.filter(p => p.type === "text").map(p => (p as any).text || "").join("");
          const newPart = fullText.slice(lastAppendedLength);
          
          if (newPart && activeChapter()) {
              updateChapterContent(activeChapter()!.id, activeChapter()!.content + newPart);
              lastAppendedLength = fullText.length;
          }
      } else if (status() === "ready" && lastAppendedLength > 0) {
          // Reset when done
          lastAppendedLength = 0; 
      }
  });

  const handleContinue = async () => {
    if (isGenerating() || !activeChapter()) return;
    
    const content = activeChapter()!.content;
    const context = content.slice(-2000); // Last 2000 chars
    
    lastAppendedLength = 0; // Reset tracker
    
    await sendMessage({
        role: "user" as any,
        parts: [{ type: "text", text: `[Context]\n${context}\n\n[Instruction]\nContinue the story.` }]
    });
  };
  
  const handleExport = () => {
      if (!activeChapter()) return;
      const element = document.createElement("a");
      const file = new Blob([activeChapter()!.content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${activeChapter()!.title || "Chapter"}.md`;
      document.body.appendChild(element);
      element.click();
  }

  return (
    <div class={`flex flex-col h-full max-w-3xl mx-auto w-full p-8 ${props.class}`}>
      <Show 
        when={activeChapter()} 
        fallback={
          <div class="flex-1 flex items-center justify-center text-muted-foreground">
            Select or create a chapter to start writing.
          </div>
        }
      >
        <div class="mb-6 flex justify-between items-center">
             <input 
                type="text" 
                class="w-full text-4xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50"
                value={activeChapter()?.title}
                onInput={(e) => updateChapterTitle(activeChapter()!.id, e.currentTarget.value)}
                placeholder="Chapter Title"
             />
             <div class="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={handleExport} title="Export Markdown">
                     <Download class="h-5 w-5 text-muted-foreground" />
                 </Button>
             </div>
        </div>
        
        {/* Toolbar */}
        <div class="flex items-center gap-2 mb-4 bg-muted/30 p-2 rounded-lg sticky top-0 z-10 backdrop-blur-sm">
             <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleContinue}
                disabled={isGenerating()}
                class="gap-2"
             >
                <Sparkles class={`h-4 w-4 ${isGenerating() ? "animate-spin" : ""}`} />
                {isGenerating() ? "Writing..." : "Continue"}
             </Button>
             <p class="text-xs text-muted-foreground ml-2">
                 AI will read the last 2000 characters and continue the story.
             </p>
        </div>

        <Textarea
            class="flex-1 w-full bg-transparent resize-none border-none focus:outline-none text-lg leading-relaxed font-serif p-0 placeholder:text-muted-foreground/30 focus:ring-0 shadow-none focus-visible:ring-0 min-h-[500px]"
            value={activeChapter()?.content}
            onInput={(e) => updateChapterContent(activeChapter()!.id, e.currentTarget.value)}
            placeholder="Start writing your story here..."
            spellcheck={false}
        />
        
        <div class="text-xs text-muted-foreground mt-4 text-right">
            {activeChapter()?.content.length || 0} characters
        </div>
      </Show>
    </div>
  );
};

export default SimpleEditor;
