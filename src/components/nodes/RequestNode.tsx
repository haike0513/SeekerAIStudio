import { Component } from "solid-js";
import { Handle, NodeComponentProps } from "@ensolid/solidflow";
import { Globe } from "lucide-solid";

export const RequestNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "200px" }}
      class="min-w-[200px] rounded-lg bg-white border border-blue-200 shadow-sm overflow-hidden"
    >
      <div class="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <Globe class="h-4 w-4 text-blue-500" />
        <span class="text-xs font-bold text-blue-800">HTTP Request</span>
      </div>
       <div class="p-3">
        <div class="flex items-center gap-2 mb-1">
           <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
             props.node.data?.method === 'POST' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
           }`}>{props.node.data?.method || 'GET'}</span>
           <span class="text-xs text-gray-600 truncate flex-1">{props.node.data?.url || '/api/...'}</span>
        </div>
      </div>
      <Handle type="target" position="left" class="!bg-blue-400" />
      <Handle type="source" position="right" class="!bg-blue-400" />
    </div>
  );
};
