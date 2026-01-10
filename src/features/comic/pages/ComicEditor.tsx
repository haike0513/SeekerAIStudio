import { Component, For, Show, createSignal } from "solid-js";
import { useComicStore, ComicPanel } from "../stores/comicStore";
import { Button } from "../../../components/ui/button";
import { Image, Type, Sparkles, FileText, Wand2 } from "lucide-solid";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { generateImage } from "ai";
import { registry } from "@/lib/ai/registry";

const PanelView: Component<{ panel: ComicPanel }> = (props) => {
    const { setPanelStatus, setPanelImage, activePage } = useComicStore();

    const handleGenerate = async () => {
        const page = activePage();
        if (!page) return;
        
        setPanelStatus(props.panel.id, "generating");
        
        // Mock Generation - Combining page prompt and panel prompt for better context
        const fullPrompt = `${page.prompt}. ${props.panel.prompt}`;
        
        setTimeout(() => {
            // Placeholder Image using the combined prompt
            setPanelImage(props.panel.id, `https://placehold.co/600x400/222/FFF?text=${encodeURIComponent(fullPrompt.substring(0, 30))}`);
        }, 2000);
    };

    return (
        <div 
            class="absolute border-2 border-foreground bg-card overflow-hidden group"
            style={{
                left: `${props.panel.x}px`,
                top: `${props.panel.y}px`,
                width: `${props.panel.width}px`,
                height: `${props.panel.height}px`
            }}
        >
            <Show when={props.panel.imageUrl} fallback={
                <div class="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                    <p class="text-sm text-muted-foreground mb-2">{props.panel.prompt}</p>
                    <Button size="sm" variant="secondary" onClick={handleGenerate} disabled={props.panel.status === "generating"}>
                       <Sparkles class={`mr-2 h-3 w-3 ${props.panel.status === "generating" ? "animate-spin" : ""}`} />
                       {props.panel.status === "generating" ? "Generating..." : "Generate Art"}
                    </Button>
                </div>
            }>
                <img src={props.panel.imageUrl} class="w-full h-full object-cover" />
            </Show>
            
            {/* Panel Tools Overlay */}
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button size="icon" variant="secondary" class="h-6 w-6"><Image class="h-3 w-3" /></Button>
            </div>
        </div>
    );
}

const ComicEditor: Component = () => {
  const { activePage } = useComicStore();
  const [prompt, setPrompt] = createSignal("");
  const [generatedImages, setGeneratedImages] = createSignal<{ url?: string; base64?: string }[]>([]);
  const [isGenerating, setIsGenerating] = createSignal(false);

  const handleGlobalGenerate = async () => {
    if (!prompt()) return;
    
    setIsGenerating(true);
    try {
        const { images } = await generateImage({
            model: registry.imageModel("gemini:gemini-3-pro-image"),
            prompt: prompt(),
            n: 1,
            size: '1024x1024',
        });
        setGeneratedImages(images);
    } catch (error) {
        console.error("Failed to generate image:", error);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div class="flex h-[calc(100vh-4rem)] bg-muted/30">
        {/* Left: Tools */}
        <div class="w-16 border-r flex flex-col items-center py-4 gap-4 bg-background">
            <Button variant="ghost" size="icon"><Image class="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon"><Type class="h-5 w-5" /></Button>
        </div>

        {/* Center: Canvas */}
        <div class="flex-1 overflow-auto p-8 relative flex justify-center">
            <div 
                class="bg-white shadow-lg relative transition-all"
                style={{ width: "800px", height: "1100px" }} // A4ish ratio
            >
                <Show when={activePage()}>
                    {(page) => (
                        <For each={page().panels}>
                            {(panel) => <PanelView panel={panel} />}
                        </For>
                    )}
                </Show>
                
                {/* Mock Bubbles */}
                <Show when={activePage()}>
                     <For each={activePage()?.bubbles}>
                        {(bubble) => (
                            <div 
                                class="absolute bg-white border-2 border-black rounded-xl p-2 text-black text-sm font-comic shadow-sm cursor-move select-none"
                                style={{
                                    left: `${bubble.x}px`,
                                    top: `${bubble.y}px`,
                                    "max-width": "150px"
                                }}
                            >
                                {bubble.text}
                            </div>
                        )}
                     </For>
                </Show>
            </div>
        </div>

        {/* Right: Properties */}
        <div class="w-80 border-l bg-background p-6 hidden lg:block overflow-y-auto">
            <h3 class="font-bold text-lg mb-6 flex items-center gap-2">
                <FileText class="h-5 w-5" /> Properties
            </h3>
            
            <Show when={activePage()}>
                {(page) => (
                    <div class="space-y-6">
                        <div class="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                            <Label class="text-xs font-bold uppercase tracking-wider text-primary/70">AI Generator</Label>
                            <Input 
                                placeholder="What should I generate?" 
                                value={prompt()}
                                onInput={(e) => setPrompt(e.currentTarget.value)}
                                class="h-9 bg-background/50"
                            />
                            <Button class="w-full h-9" size="sm" onClick={handleGlobalGenerate} disabled={!prompt() || isGenerating()}>
                                <Wand2 class={`mr-2 h-4 w-4 ${isGenerating() ? "animate-spin" : ""}`} /> 
                                {isGenerating() ? "Generating..." : "Generate"}
                            </Button>

                            <Show when={generatedImages().length > 0}>
                                <div class="grid grid-cols-2 gap-2 pt-2">
                                    <For each={generatedImages()}>
                                        {(img) => (
                                            <div class="aspect-square rounded-md overflow-hidden border border-border bg-muted relative group">
                                                <img src={img.url || `data:image/png;base64,${img.base64}`} class="w-full h-full object-cover" />
                                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button size="icon" variant="secondary" class="h-8 w-8 rounded-full">
                                                        <Sparkles class="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        <div class="space-y-2">
                            <Label for="page-prompt" class="text-sm font-medium">Page Concept/Style</Label>
                            <Textarea 
                                id="page-prompt"
                                placeholder="Describe the overall style and theme for this page..."
                                value={page().prompt}
                                onInput={(e) => {
                                    const { updatePagePrompt } = useComicStore();
                                    updatePagePrompt(e.currentTarget.value);
                                }}
                                class="min-h-[100px] resize-none"
                            />
                            <p class="text-[10px] text-muted-foreground italic">
                                This prompt helps maintain consistency across all panels on this page.
                            </p>
                        </div>
                        
                        <div class="pt-4 border-t">
                            <h4 class="text-sm font-semibold mb-3">Panels ({page().panels.length})</h4>
                            <div class="space-y-4">
                                <For each={page().panels}>
                                    {(panel, index) => (
                                        <div class="p-3 rounded-lg bg-muted/50 text-xs border border-transparent hover:border-primary/20 transition-all">
                                            <div class="font-medium mb-1">Panel {index() + 1}</div>
                                            <p class="text-muted-foreground line-clamp-2">{panel.prompt}</p>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </div>
                    </div>
                )}
            </Show>
        </div>
    </div>
  );
};

export default ComicEditor;
