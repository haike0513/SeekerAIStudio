import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { FileText } from "lucide-solid";

export const OutputNode: Component<NodeComponentProps> = () => {
  return (
    <div
      style={{ width: "160px" }}
      class="min-w-[160px] rounded-lg bg-white border-2 border-green-400 shadow-md"
    >
      <div class="px-3 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
        <FileText class="h-4 w-4 text-green-600" />
        <span class="text-xs font-bold text-green-800">Final Output</span>
      </div>
      <div class="p-3 text-center">
        <div class="text-[10px] text-gray-500">Display Result</div>
      </div>
      <Handle type="target" position="left" class="!bg-green-500 !w-3 !h-3" />
    </div>
  );
};
