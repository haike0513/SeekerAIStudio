import { Component } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Music, Plus } from "lucide-solid";
import { useAudioStore } from "../stores/audioStore";

const AudioHome: Component = () => {
    const { state } = useAudioStore();

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Audio Projects</h1>
          <p class="text-muted-foreground">Create music, sound effects, and voice overs with AI.</p>
        </div>
        <Button>
          <Plus class="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <A href={`/audio/${state.id}`} class="block group">
            <Card class="h-full transition-colors hover:bg-muted/50 border-primary/20 bg-secondary/5">
                <CardHeader>
                  <CardTitle class="group-hover:text-primary transition-colors flex items-center gap-2">
                      <Music class="h-5 w-5" />
                      {state.title}
                  </CardTitle>
                  <CardDescription>DAW • 2 Tracks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="h-24 bg-muted/50 rounded-md flex items-center justify-center text-muted-foreground text-sm relative overflow-hidden">
                      {/* Mock Waveform */}
                      <div class="flex items-end gap-1 h-1/2 w-full px-4 justify-center opacity-50">
                          <div class="w-1 bg-foreground/50 h-full"></div>
                          <div class="w-1 bg-foreground/50 h-3/4"></div>
                          <div class="w-1 bg-foreground/50 h-1/2"></div>
                          <div class="w-1 bg-foreground/50 h-full"></div>
                          <div class="w-1 bg-foreground/50 h-2/3"></div>
                      </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div class="text-xs text-muted-foreground">
                    Last modified: Today
                  </div>
                </CardFooter>
              </Card>
            </A>
      </div>
    </div>
  );
};

export default AudioHome;
