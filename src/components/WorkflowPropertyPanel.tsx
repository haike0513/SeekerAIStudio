import { Component, Show } from "solid-js";
import { Node } from "@ensolid/solidflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-solid";

interface WorkflowPropertyPanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateNodeData: (nodeId: string, data: any) => void;
}

export const WorkflowPropertyPanel: Component<WorkflowPropertyPanelProps> = (props) => {
  const node = () => props.selectedNode;

  if (!node()) return null;

  const updateData = (data: any) => {
    props.onUpdateNodeData(node()!.id, data);
  };

  return (
    <div class="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-40 transition-transform duration-200 ease-in-out">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Show when={node()!.type === "agent"}>🤖</Show>
            <Show when={node()!.type === "task"}>📋</Show>
            <Show when={node()!.type === "tool"}>🛠️</Show>
            <Show when={node()!.type === "trigger"}>🚀</Show>
            <Show when={node()!.type === "script"}>📜</Show>
            <Show when={node()!.type === "condition"}>🔀</Show>
            <Show when={node()!.type === "request"}>🌐</Show>
            <Show when={node()!.type === "delay"}>⏱️</Show>
            <Show when={node()!.type === "input"}>⌨️</Show>
            <Show when={node()!.type === "image-gen"}>🎨</Show>
            <Show when={node()!.type === "output"}>✅</Show>
          </div>
          <div>
            <h2 class="text-sm font-bold text-gray-900 capitalize">
              {node()!.type} Properties
            </h2>
            <p class="text-[10px] text-gray-500 font-mono">{node()!.id}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-gray-400 hover:text-gray-700"
          onClick={props.onClose}
        >
          <X class="h-4 w-4" />
        </Button>
      </div>

      <div class="p-4 space-y-4">
        {/* Common Fields */}
        <div class="space-y-1.5">
          <Label class="text-xs font-semibold text-gray-700">Label</Label>
          <Input
            type="text"
            value={node()!.data?.label || ""}
            onInput={(e) => updateData({ label: e.currentTarget.value })}
            class="w-full px-3 py-2 text-sm"
          />
        </div>

        {/* Agent Specific */}
        <Show when={node()!.type === "agent"}>
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">Role / System Prompt</Label>
            <Textarea
              value={node()!.data?.role || ""}
              onInput={(e) => updateData({ role: e.currentTarget.value })}
              class="w-full min-h-[100px] text-xs font-sans"
              placeholder="You are a helpful assistant..."
            />
          </div>
           <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">User Prompt Template</Label>
            <Textarea
              value={node()!.data?.userPromptTemplate || "{{input}}"}
              onInput={(e) => updateData({ userPromptTemplate: e.currentTarget.value })}
              class="w-full min-h-[80px] text-xs font-sans"
              placeholder="Process this input: {{input}}"
            />
             <p class="text-[10px] text-gray-400">Use {'{{input}}'} to insert upstream data.</p>
          </div>
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">Model</Label>
            <Select
              value={node()!.data?.model || "gpt-4"}
              onChange={(v) => updateData({ model: v })}
              options={["gpt-4", "gpt-3.5-turbo", "llama3", "mistral"]}
              itemComponent={(props) => (
                <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
              )}
            >
              <SelectTrigger class="w-full">
                <SelectValue<string>>
                  {(state) => state.selectedOption()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Show>

        {/* Task Specific */}
        <Show when={node()!.type === "task"}>
          <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">Description</Label>
            <Textarea
              value={node()!.data?.description || ""}
              onInput={(e) => updateData({ description: e.currentTarget.value })}
              rows={4}
              class="w-full text-sm resize-none"
            />
          </div>
        </Show>

         {/* Script Specific */}
         <Show when={node()!.type === "script"}>
            <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">JavaScript Code</Label>
            <Textarea
                value={node()!.data?.code || ""}
                onInput={(e) => updateData({ code: e.currentTarget.value })}
                class="w-full min-h-[200px] font-mono text-xs bg-slate-50"
                placeholder="return input + ' modified';"
            />
            <p class="text-[10px] text-gray-400">Available: <code>input</code>, <code>context</code></p>
            </div>
        </Show>

        {/* Condition Specific */}
        <Show when={node()!.type === "condition"}>
            <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">Condition Expression (JS)</Label>
            <Input
                type="text"
                value={node()!.data?.expression || ""}
                onInput={(e) => updateData({ expression: e.currentTarget.value })}
                class="w-full font-mono text-xs"
                placeholder="input.includes('error')"
            />
            <p class="text-[10px] text-gray-400">Return true or false.</p>
            </div>
        </Show>

        {/* Request Specific */}
        <Show when={node()!.type === "request"}>
             <div class="space-y-1.5">
                <Label class="text-xs font-semibold text-gray-700">Method</Label>
                 <Select
                  value={node()!.data?.method || "GET"}
                  onChange={(v) => updateData({ method: v })}
                  options={["GET", "POST", "PUT", "DELETE"]}
                  itemComponent={(props) => (
                    <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) => state.selectedOption()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
             </div>
             <div class="space-y-1.5">
                <Label class="text-xs font-semibold text-gray-700">URL</Label>
                <Input
                    type="text"
                    value={node()!.data?.url || ""}
                    onInput={(e) => updateData({ url: e.currentTarget.value })}
                    class="w-full font-mono text-xs"
                />
             </div>
             <Show when={node()!.data?.method !== 'GET'}>
                <div class="space-y-1.5">
                    <Label class="text-xs font-semibold text-gray-700">Body (JSON)</Label>
                    <Textarea
                        value={node()!.data?.body || ""}
                        onInput={(e) => updateData({ body: e.currentTarget.value })}
                        class="w-full min-h-[100px] font-mono text-xs"
                        placeholder='{"key": "value"}'
                    />
                </div>
             </Show>
        </Show>

        {/* Delay Node */}
        <Show when={node()!.type === 'delay'}>
            <div class="space-y-1">
            <Label class="text-xs">Duration (ms)</Label>
            <Input 
                type="number"
                value={node()!.data?.duration}
                onInput={(e) => updateData({ duration: e.currentTarget.value })}
            />
            </div>
        </Show>

        {/* Input Node */}
        <Show when={node()!.type === 'input'}>
            <div class="space-y-1">
            <Label class="text-xs">Prompt Message</Label>
            <Textarea 
                value={node()!.data?.prompt}
                class="min-h-[80px] font-sans text-xs"
                placeholder="What do you want to ask the user?"
                onInput={(e) => updateData({ prompt: e.currentTarget.value })}
            />
            </div>
        </Show>

        {/* Image Gen Node */}
        <Show when={node()!.type === 'image-gen'}>
            <div class="space-y-1">
            <Label class="text-xs">Image Prompt</Label>
            <Textarea 
                value={node()!.data?.prompt}
                class="min-h-[80px] font-sans text-xs"
                placeholder="Describe the image..."
                onInput={(e) => updateData({ prompt: e.currentTarget.value })}
            />
            </div>
             <div class="space-y-1.5">
            <Label class="text-xs font-semibold text-gray-700">Size</Label>
            <Select
              value={node()!.data?.size || "1024x1024"}
              onChange={(v) => updateData({ size: v })}
              options={["256x256", "512x512", "1024x1024"]}
              itemComponent={(props) => (
                <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
              )}
            >
              <SelectTrigger class="w-full">
                <SelectValue<string>>
                  {(state) => state.selectedOption()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent />
            </Select>
          </div>
        </Show>

        <div class="pt-4 border-t border-gray-100">
          <h3 class="text-xs font-bold text-gray-900 mb-2">Metadata</h3>
          <div class="grid grid-cols-2 gap-2">
            <div class="bg-gray-50 p-2 rounded border border-gray-100">
              <div class="text-[10px] text-gray-400">Position X</div>
              <div class="text-xs font-mono text-gray-700">
                {Math.round(node()!.position.x)}
              </div>
            </div>
            <div class="bg-gray-50 p-2 rounded border border-gray-100">
              <div class="text-[10px] text-gray-400">Position Y</div>
              <div class="text-xs font-mono text-gray-700">
                {Math.round(node()!.position.y)}
              </div>
            </div>
          </div>
           {/* Debug Output */}
           <div class="pt-4 border-t mt-4">
                <Label class="text-xs text-gray-500 mb-1 block">Last Execution Output</Label>
                <div class="bg-slate-900 text-slate-200 p-2 rounded text-[10px] font-mono max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
                    {typeof node()!.data?.lastOutput === 'object' 
                        ? JSON.stringify(node()!.data.lastOutput, null, 2) 
                        : (node()!.data?.lastOutput || "No output yet")}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
