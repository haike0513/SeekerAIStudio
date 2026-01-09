import { Component, For, createSignal } from "solid-js";
import { useNovelStore } from "../../stores/novelStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Plus } from "lucide-solid";
import AddCharacterDialog from "../Dialogs/AddCharacterDialog";

import ChatPanel from "../Copilot/ChatPanel";

const CopilotSidebar: Component<{ class?: string }> = (props) => {
  const { state } = useNovelStore();
  const [isAddCharOpen, setIsAddCharOpen] = createSignal(false);

  return (
    <div class={`flex flex-col border-l bg-background ${props.class}`}>
        <AddCharacterDialog open={isAddCharOpen()} onOpenChange={setIsAddCharOpen} />
      <Tabs defaultValue="chat" class="flex-1 flex flex-col w-full h-full">
        <div class="p-2 border-b">
             <TabsList class="w-full grid grid-cols-3">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="characters">Chars</TabsTrigger>
                <TabsTrigger value="outline">Outline</TabsTrigger>
            </TabsList>
        </div>

        <TabsContent value="chat" class="flex-1 overflow-hidden p-0">
             <ChatPanel />
        </TabsContent>

        <TabsContent value="characters" class="flex-1 flex flex-col overflow-hidden max-h-full">
            <div class="p-2 border-b bg-muted/20">
                <Button 
                    variant="outline" 
                    size="sm" 
                    class="w-full gap-2"
                    onClick={() => setIsAddCharOpen(true)}
                >
                    <Plus class="h-4 w-4" /> Add Character
                </Button>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-4">
             <For each={state.characters}>
                {(char) => (
                    <Card>
                        <CardHeader class="p-4 pb-2">
                            <CardTitle class="text-base flex items-center justify-between">
                                {char.name}
                                <span class="text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                    {char.role}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent class="p-4 pt-0">
                            <p class="text-sm text-muted-foreground mb-2">{char.bio}</p>
                            <div class="flex flex-wrap gap-1">
                                <For each={char.traits}>
                                    {(trait) => (
                                        <span class="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                            {trait}
                                        </span>
                                    )}
                                </For>
                            </div>
                        </CardContent>
                    </Card>
                )}
             </For>
            </div>
        </TabsContent>

        <TabsContent value="outline" class="flex-1 p-4">
            <div class="prose prose-sm dark:prose-invert">
                <h3>Story Outline</h3>
                <p class="text-muted-foreground italic">No outline generated yet.</p>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CopilotSidebar;
