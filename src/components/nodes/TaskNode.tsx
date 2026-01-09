import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";

export const TaskNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "220px", height: "auto" }}
      class={`relative min-w-[220px] rounded-xl bg-white shadow-lg transition-all hover:shadow-xl ${
        props.node.data?.executionStatus === 'running' ? 'ring-2 ring-emerald-500 ring-offset-2' :
        props.node.data?.executionStatus === 'completed' ? 'ring-2 ring-green-500 ring-offset-2' :
        props.node.data?.executionStatus === 'error' ? 'ring-2 ring-red-500 ring-offset-2' : ''
      }`}
    >
      <div class="rounded-t-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2">
        <div class="flex items-center gap-2">
          <span class="text-lg">📋</span>
          <span class="text-xs font-bold uppercase tracking-wider text-white">
            Task
          </span>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <div class="text-sm font-bold text-gray-800">
          {props.node.data?.label || "New Task"}
        </div>
        <p class="text-xs text-gray-500 leading-relaxed line-clamp-2">
          {props.node.data?.description ||
            "Define the task objectives and expected output..."}
        </p>
      </div>
      <Handle
        type="target"
        position="top"
        style={{
          width: "12px",
          height: "12px",
          background: "#10b981",
          border: "2px solid white",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-top"
      />
      <Handle
        type="source"
        position="bottom"
        style={{
          width: "12px",
          height: "12px",
          background: "#10b981",
          border: "2px solid white",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-bottom"
      />
    </div>
  );
};
