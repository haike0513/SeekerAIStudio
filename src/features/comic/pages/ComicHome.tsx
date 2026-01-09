import { Component } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Palette } from "lucide-solid";
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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <A href={`/comic/${state.id}`} class="block group">
            <Card class="h-full transition-colors hover:bg-muted/50 border-primary/20 bg-secondary/5">
                <CardHeader>
                  <CardTitle class="group-hover:text-primary transition-colors">{state.title}</CardTitle>
                  <CardDescription>Sci-Fi • 1 Page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div class="aspect-video bg-muted rounded-md flex items-center justify-center text-muted-foreground text-sm">
                      Cover Preview
                  </div>
                </CardContent>
                <CardFooter>
                  <div class="text-xs text-muted-foreground">
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
