import { Component, For } from "solid-js";
import { useNovelStore } from "../../stores/novelStore";
import { Button } from "../../../../components/ui/button";
import { Plus, Trash, FileText } from "lucide-solid"; // Assuming icons

const ChapterSidebar: Component<{ class?: string }> = (props) => {
  const { state, activeChapter, setActiveChapter, addChapter, deleteChapter } = useNovelStore();

  return (
    <div class={`flex flex-col border-r bg-background ${props.class}`}>
      <div class="p-4 border-b flex justify-between items-center">
        <h2 class="font-semibold text-lg">Chapters</h2>
        <Button variant="ghost" size="icon" onClick={addChapter}>
          <Plus class="h-4 w-4" />
        </Button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <For each={state.chapters}>
          {(chapter) => (
            <div
              class={`flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors group ${
                activeChapter()?.id === chapter.id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted"
              }`}
              onClick={() => setActiveChapter(chapter.id)}
            >
              <div class="flex items-center gap-2 truncate">
                <FileText class="h-4 w-4 opacity-50" />
                <span class="truncate">{chapter.title}</span>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                class="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-background/50"
                onClick={(e) => {
                    e.stopPropagation();
                    deleteChapter(chapter.id);
                }}
              >
                 <Trash class="h-3 w-3 text-destructive" />
              </Button>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default ChapterSidebar;
