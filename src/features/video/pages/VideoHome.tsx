import { Component } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Film, Plus } from "lucide-solid";
import { useVideoStore } from "../stores/videoStore";

const VideoHome: Component = () => {
    const { state } = useVideoStore();

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Video Projects</h1>
          <p class="text-muted-foreground">Create AI-generated videos and movies.</p>
        </div>
        <Button>
          <Plus class="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <A href={`/video/${state.id}`} class="block group">
            <Card class="h-full transition-colors hover:bg-muted/50 border-primary/20 bg-secondary/5">
                <CardHeader>
                  <CardTitle class="group-hover:text-primary transition-colors flex items-center gap-2">
                      <Film class="h-5 w-5" />
                      {state.title}
                  </CardTitle>
                  <CardDescription>1080p • 30s</CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="aspect-video bg-black rounded-md flex items-center justify-center text-muted-foreground text-sm relative overflow-hidden group-hover:scale-[1.02] transition-transform">
                      {/* Mock Thumbnail */}
                      <div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-2">
                          <span class="text-white text-xs font-mono">00:00 / 00:30</span>
                      </div>
                      <Film class="h-8 w-8 opacity-20" />
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

export default VideoHome;
