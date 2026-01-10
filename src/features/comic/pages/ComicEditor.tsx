import { Component, For, Show, createSignal } from "solid-js";
import { useComicStore, ComicPanel } from "../stores/comicStore";
import { Button } from "../../../components/ui/button";
import { Image, Type, Sparkles, FileText, Wand2, Download, Save, Eye, Check, X } from "lucide-solid";
import { Textarea } from "../../../components/ui/textarea";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
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
  const { activePage, addGeneratedImage } = useComicStore();
  const [prompt, setPrompt] = createSignal("生成几位动漫风格的，具有不同鲜明特色的仙侠背景的女主形象");
  const [generatedImages, setGeneratedImages] = createSignal<{ url?: string; base64?: string; prompt?: string }[]>([]);
  const [previewImage, setPreviewImage] = createSignal<{ url?: string; base64?: string; prompt?: string } | null>(null);
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
        
        const newImages = images.map(img => (Object.assign(img, { prompt: prompt() })));
        setGeneratedImages(prev => [...newImages, ...prev]);

        // Auto-save to store if needed, but for now we let user choose to save
        // newImages.forEach(img => addGeneratedImage(img, prompt()));
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
                                <div class="grid grid-cols-2 gap-2 pt-2 max-h-[300px] overflow-y-auto pr-1">
                                    <For each={generatedImages()}>
                                        {(img) => {
                                            const imgSrc = img.url || `data:image/png;base64,${img.base64}`;
                                            const [saved, setSaved] = createSignal(false);
                                            
                                            const handleSave = () => {
                                                addGeneratedImage(img, img.prompt || "Generated Image");
                                                setSaved(true);
                                                setTimeout(() => setSaved(false), 2000);
                                            };

                                            const handleDownload = () => {
                                                const link = document.createElement("a");
                                                link.href = imgSrc;
                                                link.download = `generated-${Date.now()}.png`;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            };

                                            return (
                                                <div class="aspect-square rounded-md overflow-hidden border border-border bg-muted relative group">
                                                    <img src={imgSrc} class="w-full h-full object-cover" />
                                                    <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                                        <div class="flex gap-1">
                                                            <Button size="icon" variant="secondary" class="h-7 w-7 rounded-full" onClick={() => setPreviewImage(img)} title="Preview">
                                                                <Eye class="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button size="icon" variant="secondary" class="h-7 w-7 rounded-full" onClick={handleSave} title="Save to Library">
                                                                <Show when={saved()} fallback={<Save class="h-3.5 w-3.5" />}>
                                                                    <Check class="h-3.5 w-3.5 text-green-600" />
                                                                </Show>
                                                            </Button>
                                                        </div>
                                                        <Button size="icon" variant="ghost" class="h-6 w-6 text-white/70 hover:text-white" onClick={handleDownload} title="Download">
                                                            <Download class="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        }}
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

    {/* Preview Dialog */}
    <Dialog open={!!previewImage()} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent class="max-w-3xl w-full p-0 overflow-hidden bg-black/90 border-none">
            <div class="relative w-full h-[80vh] flex items-center justify-center">
                <Show when={previewImage()}>
                    {(img) => (
                        <>
                            <img 
                                src={img().url || `data:image/png;base64,${img().base64}`} 
                                class="max-w-full max-h-full object-contain" 
                            />
                            <div class="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                                <p class="text-sm font-medium line-clamp-2">{img().prompt}</p>
                                <div class="flex gap-2 mt-2 justify-end">
                                    <Button size="sm" variant="secondary" onClick={() => {
                                        const link = document.createElement("a");
                                        const src = img().url || `data:image/png;base64,${img().base64}`;
                                        link.href = src!;
                                        link.download = `generated-${Date.now()}.png`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}>
                                        <Download class="mr-2 h-4 w-4" /> Download
                                    </Button>
                                    <Button size="sm" onClick={() => {
                                         addGeneratedImage(img(), img().prompt || "Generated Image");
                                         setPreviewImage(null);
                                    }}>
                                        <Save class="mr-2 h-4 w-4" /> Save to Library
                                    </Button>
                                </div>
                            </div>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                class="absolute top-2 right-2 text-white hover:bg-white/20" 
                                onClick={() => setPreviewImage(null)}
                            >
                                <X class="h-5 w-5" />
                            </Button>
                        </>
                    )}
                </Show>
            </div>
        </DialogContent>
    </Dialog>
    </div>
  );
};

export default ComicEditor;
