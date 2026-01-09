import { Component, For, createSignal } from "solid-js";
import { useAudioStore, AudioTrack } from "../stores/audioStore";
import { Button } from "../../../components/ui/button";
import { Play, Pause, SkipBack, Mic, Music, Volume2, Wand2, Plus } from "lucide-solid";

const TrackComponent: Component<{ track: AudioTrack }> = (props) => {
    return (
        <div class="flex h-24 border-b bg-card">
            {/* Track Header */}
            <div class="w-64 border-r p-2 flex flex-col justify-between shrink-0 bg-muted/20">
                <div class="flex items-center gap-2 font-medium overflow-hidden">
                    {props.track.type === "voice" ? <Mic class="h-4 w-4" /> : 
                     props.track.type === "music" ? <Music class="h-4 w-4" /> : <Volume2 class="h-4 w-4" />}
                    <span class="truncate">{props.track.name}</span>
                </div>
                <div class="flex items-center gap-2">
                    <input type="range" class="w-full h-1" min={0} max={1} step={0.1} value={props.track.volume} />
                </div>
            </div>

            {/* Timeline Lane */}
            <div class="flex-1 relative bg-background/50 overflow-hidden">
                {/* Grid Lines */}
                <div class="absolute inset-0 pointer-events-none opacity-10" 
                     style={{ "background-image": "linear-gradient(90deg, #888 1px, transparent 1px)", "background-size": "100px 100%" }}>
                </div>

                <For each={props.track.clips}>
                    {(clip) => (
                        <div 
                            class="absolute top-1 bottom-1 rounded-md border text-xs p-1 px-2 whitespace-nowrap overflow-hidden select-none cursor-move hover:brightness-110 shadow-sm"
                            style={{
                                left: `${clip.startTime * 20}px`, // 20px per second
                                width: `${clip.duration * 20}px`,
                                "background-color": clip.color || "#3b82f6",
                                "border-color": "rgba(255,255,255,0.2)",
                                color: "white"
                            }}
                        >
                            {clip.label}
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
};

const AudioEditor: Component = () => {
  const { state, addTrack } = useAudioStore();
  const [isPlaying, setIsPlaying] = createSignal(false);

  return (
    <div class="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Toolbar */}
        <div class="h-14 border-b bg-muted/10 flex items-center px-4 gap-4">
            <div class="flex items-center gap-2 mr-8">
                <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying())}>
                    {isPlaying() ? <Pause class="h-4 w-4" /> : <Play class="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon">
                    <SkipBack class="h-4 w-4" />
                </Button>
                <span class="font-mono text-xl ml-2 text-primary">00:00:00</span>
            </div>

            <div class="h-6 w-px bg-border mx-2" />

            <div class="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => addTrack("voice")}>
                    <Mic class="h-3 w-3 mr-2" /> Note Track
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addTrack("music")}>
                    <Music class="h-3 w-3 mr-2" /> MusicGen
                </Button>
                <Button size="sm" variant="secondary" onClick={() => addTrack("sfx")}>
                    <Volume2 class="h-3 w-3 mr-2" /> SFX
                </Button>
            </div>

            <div class="flex-1" />
            
            <Button size="sm" class="gap-2">
                <Wand2 class="h-3 w-3" /> Auto Mix
            </Button>
        </div>

        {/* Timeline Header (Ruler) */}
        <div class="h-8 border-b bg-muted/30 flex">
            <div class="w-64 border-r shrink-0" />
            <div class="flex-1 relative overflow-hidden text-xs text-muted-foreground">
                 {/* Mock Ruler */}
                 <div class="absolute inset-x-0 h-full flex items-end pb-1 px-1">
                     <span class="absolute left-0">0s</span>
                     <span class="absolute left-[100px]">5s</span>
                     <span class="absolute left-[200px]">10s</span>
                     <span class="absolute left-[300px]">15s</span>
                     <span class="absolute left-[400px]">20s</span>
                     <span class="absolute left-[500px]">25s</span>
                 </div>
            </div>
        </div>

        {/* Tracks Area */}
        <div class="flex-1 overflow-y-auto">
            <For each={state.tracks}>
                {(track) => <TrackComponent track={track} />}
            </For>
            
            <div class="p-8 flex justify-center opacity-50 hover:opacity-100 transition-opacity">
                 <Button variant="ghost" class="gap-2" onClick={() => addTrack("voice")}>
                     <Plus class="h-4 w-4" /> Add Track
                 </Button>
            </div>
        </div>
    </div>
  );
};

export default AudioEditor;
