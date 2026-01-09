import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { Keyboard } from "lucide-solid";

export const InputNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "160px" }}
      class="min-w-[160px] rounded-lg bg-pink-50 border border-pink-200 shadow-sm"
    >
      <div class="px-3 py-2 bg-pink-100 border-b border-pink-200 flex items-center gap-2">
        <Keyboard class="h-4 w-4 text-pink-600" />
        <span class="text-xs font-bold text-pink-800">Human Input</span>
      </div>
      <div class="p-3">
        <p class="text-[10px] text-gray-600 line-clamp-2">
            {props.node.data?.prompt || "Ask user..."}
        </p>
      </div>
      <Handle type="target" position="left" class="!bg-pink-400" />
      <Handle type="source" position="right" class="!bg-pink-400" />
    </div>
  );
};
