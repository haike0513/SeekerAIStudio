import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { Clock } from "lucide-solid";

export const DelayNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "120px" }}
      class="min-w-[120px] rounded-lg bg-indigo-50 border border-indigo-200 shadow-sm"
    >
      <div class="p-2 flex flex-col items-center justify-center text-center">
         <Clock class="h-6 w-6 text-indigo-500 mb-1" />
         <div class="text-xs font-bold text-gray-700">Delay</div>
         <div class="text-[10px] text-gray-500">
            {props.node.data?.duration || "1000"}ms
         </div>
      </div>
      <Handle type="target" position="left" class="!bg-indigo-400" />
      <Handle type="source" position="right" class="!bg-indigo-400" />
    </div>
  );
};
