import { Component, For } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Palette, FileText } from "lucide-solid";
import { useComicStore } from "../stores/comicStore";

const ComicHome: Component = () => {
    const { state } = useComicStore();

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Comic Projects</h1>
          <p class="text-muted-foreground">Create visual stories with AI.</p>
        </div>
        <Button>
          <Palette class="mr-2 h-4 w-4" /> New Comic
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <A href={`/comic/${state.id}`} class="block group">
            <Card class="h-full transition-all hover:ring-2 hover:ring-primary/50 border-primary/20 bg-secondary/5 overflow-hidden">
                <CardHeader>
                  <CardTitle class="group-hover:text-primary transition-colors flex items-center justify-between">
                    {state.title}
                    <span class="text-xs font-normal px-2 py-1 bg-primary/10 text-primary rounded-full">Active</span>
                  </CardTitle>
                  <CardDescription>Sci-Fi Genre • {state.pages.length} {state.pages.length === 1 ? 'Page' : 'Pages'}</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="aspect-[4/3] bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-muted-foreground/20">
                      Cover Preview
                  </div>
                  
                  <div class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Page Prompts</p>
                    <For each={state.pages}>
                      {(page, index) => (
                        <div class="flex gap-3 items-start p-2 rounded bg-background/50 border border-border/50">
                           <FileText class="h-4 w-4 mt-0.5 text-primary/70 shrink-0" />
                           <div class="space-y-1 overflow-hidden">
                             <p class="text-[10px] font-bold text-muted-foreground uppercase">Page {index() + 1}</p>
                             <p class="text-xs text-foreground/80 line-clamp-2 italic">"{page.prompt}"</p>
                           </div>
                        </div>
                      )}
                    </For>
                  </div>
                </CardContent>
                <CardFooter class="bg-muted/30 pt-3">
                  <div class="text-[10px] text-muted-foreground">
                    Last modified: Just now
                  </div>
                </CardFooter>
              </Card>
            </A>
      </div>
    </div>
  );
};

export default ComicHome;
