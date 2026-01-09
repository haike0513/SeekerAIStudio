import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { Image as ImageIcon } from "lucide-solid";

export const ImageGenNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "180px" }}
      class="min-w-[180px] rounded-lg bg-purple-50 border border-purple-200 shadow-sm overflow-hidden"
    >
      <div class="px-3 py-2 bg-purple-100 border-b border-purple-200 flex items-center gap-2">
        <ImageIcon class="h-4 w-4 text-purple-600" />
        <span class="text-xs font-bold text-purple-800">AI Drawing</span>
      </div>
      <div class="p-3">
         <div class="text-[10px] text-gray-500 font-medium mb-1">Prompt:</div>
         <div class="text-[10px] text-gray-700 line-clamp-2 italic bg-white/50 p-1 rounded">
            {props.node.data?.prompt || "Enter prompt..."}
         </div>
      </div>
      <Handle type="target" position="left" class="!bg-purple-400" />
      <Handle type="source" position="right" class="!bg-purple-400" />
    </div>
  );
};
