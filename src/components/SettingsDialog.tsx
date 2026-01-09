import { Component, createSignal, For, Show } from "solid-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aiConfig, setAiConfig } from "@/lib/store/ai-config";
import { Settings, Plus, Trash, Check } from "lucide-solid";

export const SettingsDialog: Component<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = (props) => {
  // Local state for editing to avoid constant store updates (optional, but good practice)
  // For simplicity here, we'll bind directly to store or use simple handlers

  const [activeTabId, setActiveTabId] = createSignal(aiConfig.defaultProviderId);



  const currentProvider = () =>
    aiConfig.providers.find((p) => p.id === activeTabId());

  const addProvider = () => {
    const newId = `custom-${Date.now()}`;
    setAiConfig("providers", [
      ...aiConfig.providers,
      {
        id: newId,
        name: "New Provider",
        type: "openai", // defaul to openai compatible
        baseUrl: "https://api.example.com/v1",
        apiKey: "",
        enabled: true,
        models: ["my-model"],
      },
    ]);
    setActiveTabId(newId);
  };

  const removeProvider = (id: string) => {
    if (aiConfig.providers.length <= 1) return; // Don't delete last one
    setAiConfig(
      "providers",
      aiConfig.providers.filter((p) => p.id !== id)
    );
    if (activeTabId() === id) {
      setActiveTabId(aiConfig.providers[0].id);
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <Settings class="h-5 w-5" />
            AI Model Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI providers and models. Local (Ollama) and Cloud (OpenAI, DeepSeek) are supported.
          </DialogDescription>
        </DialogHeader>

        <div class="flex gap-6 py-4 h-[400px]">
          {/* Left Sidebar: Provider List */}
          <div class="w-1/3 border-r pr-4 space-y-2 flex flex-col">
            <Label class="text-xs font-semibold text-gray-500 uppercase mb-2">Providers</Label>
            <div class="flex-1 overflow-y-auto space-y-1">
              <For each={aiConfig.providers}>
                {(provider) => (
                  <button
                    onClick={() => setActiveTabId(provider.id)}
                    class={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                      activeTabId() === provider.id
                        ? "bg-slate-900 text-white"
                        : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span class="truncate">{provider.name}</span>
                    <Show when={activeTabId() === provider.id && provider.id === aiConfig.defaultProviderId}>
                       <Check class="h-3 w-3 text-green-400" />
                    </Show>
                  </button>
                )}
              </For>
            </div>
            <Button variant="outline" size="sm" class="w-full gap-2 mt-2" onClick={addProvider}>
              <Plus class="h-4 w-4" /> Add Custom
            </Button>
          </div>

          {/* Right Content: Details */}
          <div class="flex-1 space-y-4 overflow-y-auto pl-1">
            <Show when={currentProvider()} fallback={<div>Select a provider</div>}>
              {(provider) => (
                <>
                  <div class="grid gap-2">
                    <Label for="provider-name">Name</Label>
                    <Input
                      id="provider-name"
                      value={provider().name}
                      onInput={(e) =>
                        setAiConfig("providers", (p) => p.id === provider().id, "name", e.currentTarget.value)
                      }
                    />
                  </div>

                   <div class="grid gap-2">
                    <Label for="provider-type">Type</Label>
                     <Select
                        value={provider().type}
                        onChange={(value) =>
                             setAiConfig("providers", (p) => p.id === provider().id, "type", value as any)
                        }
                        options={["openai", "ollama", "anthropic"]}
                        itemComponent={(props) => (
                            <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                        )}
                    >
                        <SelectTrigger>
                            <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                        </SelectTrigger>
                        <SelectContent />
                    </Select>
                  </div>

                  <div class="grid gap-2">
                    <Label for="base-url">Base URL</Label>
                    <Input
                      id="base-url"
                      value={provider().baseUrl || ""}
                      placeholder="https://api.openai.com/v1"
                      onInput={(e) =>
                         setAiConfig("providers", (p) => p.id === provider().id, "baseUrl", e.currentTarget.value)
                      }
                    />
                    <p class="text-[10px] text-gray-500">
                      For Ollama, use: <code>http://localhost:11434/api</code> (or /v1 for openai compat)
                    </p>
                  </div>

                  <div class="grid gap-2">
                    <Label for="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      value={provider().apiKey || ""}
                      placeholder="sk-..."
                      onInput={(e) =>
                        setAiConfig("providers", (p) => p.id === provider().id, "apiKey", e.currentTarget.value)
                      }
                    />
                  </div>

                  <div class="grid gap-2">
                    <Label>Models (comma separated)</Label>
                    <Input
                      value={provider().models.join(", ")}
                      onInput={(e) =>
                        setAiConfig(
                          "providers",
                          (p) => p.id === provider().id,
                          "models",
                          e.currentTarget.value.split(",").map((s) => s.trim())
                        )
                      }
                    />
                  </div>

                  <div class="pt-4 flex items-center justify-between border-t mt-4">
                     <Button 
                        variant={aiConfig.defaultProviderId === provider().id ? "secondary" : "default"}
                        size="sm"
                        disabled={aiConfig.defaultProviderId === provider().id}
                        onClick={() => setAiConfig("defaultProviderId", provider().id)}
                     >
                        {aiConfig.defaultProviderId === provider().id ? "Active Default" : "Set as Default"}
                     </Button>

                     <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => removeProvider(provider().id)}
                        disabled={["openai", "ollama", "deepseek"].includes(provider().id)} // Protect defaults
                     >
                        <Trash class="h-4 w-4" />
                     </Button>
                  </div>
                </>
              )}
            </Show>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
