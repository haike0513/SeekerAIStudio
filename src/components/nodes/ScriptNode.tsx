import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { Code } from "lucide-solid";

export const ScriptNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "180px" }}
      class="min-w-[180px] rounded-lg bg-slate-900 border border-slate-700 shadow-md overflow-hidden"
    >
      <div class="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
        <Code class="h-4 w-4 text-yellow-400" />
        <span class="text-xs font-bold text-slate-200">Script</span>
      </div>
      <div class="p-3">
        <div class="text-sm font-medium text-slate-300">
          {props.node.data?.label || "JS Runner"}
        </div>
        <div class="text-[10px] text-slate-500 font-mono mt-1 truncate">
          {props.node.data?.code ? "fn(inputs)..." : "No code defined"}
        </div>
      </div>
      <Handle
        type="target"
        position="left"
        class="!bg-yellow-500 !w-3 !h-3 !border-2 !border-slate-800"
      />
      <Handle
        type="source"
        position="right"
        class="!bg-yellow-500 !w-3 !h-3 !border-2 !border-slate-800"
      />
    </div>
  );
};
