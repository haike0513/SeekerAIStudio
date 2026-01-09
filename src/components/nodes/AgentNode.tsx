import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";

export const AgentNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "180px", height: "auto" }}
      class={`relative group min-w-[180px] rounded-xl bg-white shadow-lg transition-all hover:shadow-xl ${
        props.node.data?.executionStatus === 'running' ? 'ring-2 ring-indigo-500 ring-offset-2' :
        props.node.data?.executionStatus === 'completed' ? 'ring-2 ring-green-500 ring-offset-2' :
        props.node.data?.executionStatus === 'error' ? 'ring-2 ring-red-500 ring-offset-2' : ''
      }`}
    >
      {/* Glassmorphism Header */}
      <div class="rounded-t-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">🤖</span>
          <span class="text-xs font-bold uppercase tracking-wider text-white">
            Agent
          </span>
        </div>
      </div>

      {/* Content */}
      <div class="p-4">
        <div class="text-sm font-bold text-gray-800">
          {props.node.data?.label || "New Agent"}
        </div>
        <div class="mt-1 text-xs text-gray-500">
          {props.node.data?.role || "Assistant"}
        </div>

        <div class="mt-3 flex gap-1 flex-wrap">
          <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] text-indigo-600 font-medium">
            {props.node.data?.model || "GPT-4"}
          </span>
          <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-[10px] text-indigo-600 font-medium">
            Memory
          </span>
        </div>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position="left"
        style={{
          width: "12px",
          height: "12px",
          background: "#6366f1",
          border: "2px solid white",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-left"
      />
      <Handle
        type="source"
        position="right"
        style={{
          width: "12px",
          height: "12px",
          background: "#6366f1",
          border: "2px solid white",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-right"
      />
    </div>
  );
};
