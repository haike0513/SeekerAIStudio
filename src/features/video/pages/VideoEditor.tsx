import { Component, For, createSignal } from "solid-js";
import { useVideoStore, VideoTrack } from "../stores/videoStore";
import { Button } from "../../../components/ui/button";
import { Play, Pause, SkipBack, Film, Music, Scissors, Wand2, Plus, Settings } from "lucide-solid";

const TimelineTrack: Component<{ track: VideoTrack }> = (props) => {
    return (
        <div class="flex h-24 border-b bg-card/50">
            {/* Track Header */}
            <div class="w-24 border-r p-2 flex flex-col items-center justify-center shrink-0 bg-muted/20 gap-1">
                {props.track.type === "video" ? <Film class="h-4 w-4" /> : <Music class="h-4 w-4" />}
                <span class="text-xs truncate w-full text-center">{props.track.name}</span>
            </div>

            {/* Timeline Lane */}
            <div class="flex-1 relative bg-background/30 overflow-hidden">
                {/* Grid */}
                 <div class="absolute inset-0 pointer-events-none opacity-5" 
                     style={{ "background-image": "linear-gradient(90deg, #fff 1px, transparent 1px)", "background-size": "50px 100%" }}>
                </div>
                
                <For each={props.track.clips}>
                    {(clip) => (
                        <div 
                            class="absolute top-1 bottom-1 rounded border border-white/20 overflow-hidden select-none cursor-move hover:brightness-110 shadow-sm flex items-center justify-center group"
                            style={{
                                left: `${clip.startTime * 10}px`, // 10px per second scale
                                width: `${clip.duration * 10}px`,
                                "background-color": props.track.type === "video" ? "#222" : "#1e40af"
                            }}
                        > 
                            {props.track.type === "video" && clip.thumbnailUrl && (
                                <img src={clip.thumbnailUrl} class="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                            )}
                            <span class="relative z-10 text-[10px] text-white/80 drop-shadow-md truncate px-1">{clip.label}</span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};

const VideoEditor: Component = () => {
  const { state } = useVideoStore();
  const [isPlaying, setIsPlaying] = createSignal(false);

  return (
    <div class="flex flex-col h-[calc(100vh-4rem)] bg-background text-foreground">
        {/* Top Area: Preview & Generator */}
        <div class="flex-1 flex min-h-0 border-b border-border">
            {/* Left: Assets */}
            <div class="w-64 border-r bg-muted/10 p-4 hidden md:flex flex-col">
                <h3 class="font-semibold mb-4 flex items-center gap-2"><Film class="h-4 w-4" /> Assets</h3>
                <div class="grid grid-cols-2 gap-2">
                    <div class="aspect-video bg-muted rounded cursor-pointer hover:ring-2 ring-primary"></div>
                    <div class="aspect-video bg-muted rounded cursor-pointer hover:ring-2 ring-primary"></div>
                    <div class="aspect-video bg-muted rounded cursor-pointer hover:ring-2 ring-primary"></div>
                    <div class="aspect-video bg-muted rounded cursor-pointer hover:ring-2 ring-primary flex items-center justify-center border border-dashed border-muted-foreground/50">
                        <Plus class="h-4 w-4 text-muted-foreground" />
                    </div>
                </div>
            </div>

            {/* Center: Player */}
            <div class="flex-1 flex flex-col bg-black relative">
                <div class="flex-1 flex items-center justify-center">
                    <div class="aspect-video bg-zinc-900 w-full max-w-4xl shadow-2xl flex items-center justify-center text-zinc-500">
                        Preview Window
                    </div>
                </div>
                {/* Transport Controls */}
                <div class="h-12 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-4">
                     <Button variant="ghost" size="icon" class="text-zinc-400 hover:text-white"><SkipBack class="h-4 w-4" /></Button>
                     <Button variant="ghost" size="icon" class="text-white bg-primary hover:bg-primary/90 rounded-full h-8 w-8 p-0" onClick={() => setIsPlaying(!isPlaying())}>
                        {isPlaying() ? <Pause class="h-4 w-4" /> : <Play class="h-4 w-4" />}
                     </Button>
                     <span class="text-xs font-mono text-zinc-400">00:00:00 / 00:00:30</span>
                </div>
            </div>

            {/* Right: Generator */}
            <div class="w-80 border-l bg-muted/10 p-4 hidden lg:block overflow-y-auto">
                 <h3 class="font-semibold mb-4 flex items-center gap-2"><Wand2 class="h-4 w-4" /> AI Generator</h3>
                 <div class="space-y-4">
                     <div class="space-y-2">
                         <label class="text-xs font-medium">Prompt</label>
                         <textarea class="w-full h-24 rounded-md border bg-background p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Describe the video scene..." />
                     </div>
                     <Button class="w-full gap-2"><Film class="h-4 w-4" /> Generate Video</Button>
                     
                     <div class="pt-4 border-t">
                         <h4 class="text-xs font-medium mb-2 text-muted-foreground">History</h4>
                         <div class="space-y-2">
                             <div class="h-16 bg-muted rounded flex items-center gap-2 p-2">
                                 <div class="h-full aspect-video bg-black rounded"></div>
                                 <div class="flex-1 min-w-0">
                                     <p class="text-xs truncate">Astronaut running on mars...</p>
                                     <p class="text-[10px] text-muted-foreground">2m ago</p>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
            </div>
        </div>

        {/* Bottom Area: Timeline */}
        <div class="h-72 bg-zinc-900 border-t border-zinc-800 flex flex-col shrink-0">
            {/* Toolbar */}
            <div class="h-10 border-b border-zinc-800 flex items-center px-4 gap-2 bg-zinc-800/50">
                 <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-zinc-300 hover:text-white hover:bg-zinc-700"><Scissors class="h-3 w-3" /> Split</Button>
                 <Button variant="ghost" size="sm" class="h-7 text-xs gap-1 text-zinc-300 hover:text-white hover:bg-zinc-700"><Settings class="h-3 w-3" /> Settings</Button>
            </div>
            
            {/* Tracks */}
            <div class="flex-1 overflow-y-auto overflow-x-hidden">
                <For each={state.tracks}>
                    {(track) => <TimelineTrack track={track} />}
                </For>
            </div>
        </div>
    </div>
  );
};

export default VideoEditor;
