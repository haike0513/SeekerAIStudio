import { Component } from "solid-js";
import { A } from "@solidjs/router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Plus } from "lucide-solid";
import { useNovelStore } from "../stores/novelStore";

const NovelHome: Component = () => {
  const { state } = useNovelStore();

  return (
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Novel Projects</h1>
          <p class="text-muted-foreground">Manage your creative writing projects.</p>
        </div>
        <Button>
          <Plus class="mr-2 h-4 w-4" /> New Project
        </Button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Currently only showing one active project from store as a demo */}
        <A href={`/novel/${state.id}`} class="block group">
            <Card class="h-full transition-colors hover:bg-muted/50 border-primary/20 bg-primary/5">
            <CardHeader>
                <CardTitle class="group-hover:text-primary transition-colors">{state.metadata.title}</CardTitle>
                <CardDescription>{state.metadata.genre}</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="text-sm text-muted-foreground">
                Author: {state.metadata.author}
                </div>
                <div class="text-sm text-muted-foreground mt-1">
                Chapters: {state.chapters.length}
                </div>
            </CardContent>
            <CardFooter>
                <div class="text-xs text-muted-foreground">
                Last modified: {new Date(state.metadata.createdAt).toLocaleDateString()}
                </div>
            </CardFooter>
            </Card>
        </A>
      </div>
    </div>
  );
};

export default NovelHome;
