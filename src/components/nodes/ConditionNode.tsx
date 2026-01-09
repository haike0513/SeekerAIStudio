import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { GitBranch } from "lucide-solid";

export const ConditionNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "140px" }}
      class="min-w-[140px] rounded-lg bg-white border-2 border-orange-200 shadow-sm"
    >
      <div class="p-2 flex flex-col items-center justify-center text-center">
         <GitBranch class="h-6 w-6 text-orange-500 mb-1" />
         <div class="text-xs font-bold text-gray-700">Condition</div>
         <div class="text-[10px] text-gray-500 truncate max-w-full px-1">
            {props.node.data?.expression || "input.contains(?)"}
         </div>
      </div>
      <Handle
        type="target"
        position="left"
        class="!bg-orange-400 !w-3 !h-3"
      />
      {/* Defined Outputs */}
      <div class="absolute -right-3 top-3 flex items-center">
         <span class="text-[9px] font-bold text-green-600 mr-1 bg-white px-1">True</span>
         <Handle type="source" position="right" id="true" class="!bg-green-500 !relative !right-0 !transform-none" />
      </div>
      <div class="absolute -right-3 bottom-3 flex items-center">
         <span class="text-[9px] font-bold text-red-600 mr-1 bg-white px-1">False</span>
         <Handle type="source" position="right" id="false" class="!bg-red-500 !relative !right-0 !transform-none" />
      </div>
    </div>
  );
};
