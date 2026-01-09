import { Component, For, Show } from "solid-js";
import { useComicStore, ComicPanel } from "../stores/comicStore";
import { Button } from "../../../components/ui/button";
import { Image, Type, Sparkles } from "lucide-solid";

const PanelView: Component<{ panel: ComicPanel }> = (props) => {
    const { setPanelStatus, setPanelImage } = useComicStore();

    const handleGenerate = async () => {
        setPanelStatus(props.panel.id, "generating");
        // Mock Generation
        setTimeout(() => {
            // Placeholder Image
            setPanelImage(props.panel.id, `https://placehold.co/600x400/222/FFF?text=${encodeURIComponent(props.panel.prompt.substring(0, 20))}`);
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
        <div class="w-64 border-l bg-background p-4 hidden lg:block">
            <h3 class="font-semibold mb-2">Properties</h3>
            <p class="text-xs text-muted-foreground">Select a panel to edit prompts.</p>
        </div>
    </div>
  );
};

export default ComicEditor;
