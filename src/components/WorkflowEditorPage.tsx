/**
 * Workflow / Agent Orchestration Page
 * Features a node-based editor for defining AI agents and their tasks.
 */
import type { Component } from "solid-js";
import { createSignal, Show, onMount, createEffect } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  Flow,
  Handle,
  Panel,
} from "@ensolid/solidflow";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  NodeComponentProps,
  FlowInstance,
} from "@ensolid/solidflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-solid";

// --- Node Components ---

// Agent Node: Represents an AI entity
const AgentNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "180px", height: "auto" }}
      class="relative group min-w-[180px] rounded-xl bg-white shadow-lg transition-all hover:shadow-xl"
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

// Task Node: Represents a unit of work
const TaskNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "220px", height: "auto" }}
      class="relative min-w-[220px] rounded-xl bg-white shadow-lg transition-all hover:shadow-xl"
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

// Trigger Node: Start of workflow
const TriggerNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "64px", height: "64px" }}
      class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg ring-4 ring-orange-100 transition-transform hover:scale-110"
    >
      <span class="text-2xl">🚀</span>
      <Handle
        type="source"
        position="right"
        style={{
          width: "16px",
          height: "16px",
          background: "#f97316",
          border: "4px solid white",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-right"
      />
    </div>
  );
};

// Tool Node: External tools
const ToolNode: Component<NodeComponentProps> = (props) => {
  return (
    <div
      style={{ width: "140px", height: "auto" }}
      class="min-w-[140px] rounded-lg bg-gray-50 shadow-sm p-2 flex items-center gap-2"
    >
      <div class="w-8 h-8 rounded bg-white border flex items-center justify-center text-lg">
        🛠️
      </div>
      <div>
        <div class="text-xs font-bold text-gray-700">
          {props.node.data?.label || "Tool"}
        </div>
        <div class="text-[10px] text-gray-500">External Capability</div>
      </div>
      <Handle
        type="target"
        position="left"
        style={{
          background: "#9ca3af",
          width: "12px",
          height: "12px",
          "border-radius": "50%",
        }}
        class="react-flow__handle react-flow__handle-left"
      />
    </div>
  );
};

// --- Main Page ---

const STORAGE_KEY_PREFIX = "workflow_";
const METADATA_KEY = "workflows_metadata";

export const WorkflowEditorPage: Component = () => {
  const params = useParams();
  const navigate = useNavigate();
  const workflowId = () => params.id;

  const [showMenu, setShowMenu] = createSignal(false);
  const [workflowName, setWorkflowName] = createSignal("未命名工作流");
  const [nodes, setNodes] = createSignal<Node[]>([]);
  const [edges, setEdges] = createSignal<Edge[]>([]);
  const [flowInstance, setFlowInstance] = createSignal<FlowInstance | null>(
    null
  );
  const [selectedNodeId, setSelectedNodeId] = createSignal<string | null>(null);
  const [isLocked, setIsLocked] = createSignal(false);
  const [isLoaded, setIsLoaded] = createSignal(false); // 标记是否已加载完成

  // 加载工作流数据
  const loadWorkflow = () => {
    const id = workflowId();
    if (!id) return;

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.name) setWorkflowName(data.name);
        if (data.nodes) setNodes(data.nodes);
        if (data.edges) setEdges(data.edges);
      } else {
        // 新工作流，初始化默认节点
        setNodes([
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 50, y: 300 },
            data: { label: "Start" },
          },
        ]);
        setEdges([]);
      }
      // 标记为已加载
      setIsLoaded(true);
    } catch (error) {
      console.error("加载工作流失败:", error);
      setIsLoaded(true); // 即使出错也标记为已加载，避免无限循环
    }
  };

  // 保存工作流数据
  const saveWorkflow = () => {
    const id = workflowId();
    if (!id) return;
    
    // 如果还未加载完成，不执行保存
    if (!isLoaded()) return;

    try {
      const data = {
        id,
        name: workflowName(),
        nodes: nodes(),
        edges: edges(),
        updatedAt: new Date().toISOString(),
      };

      // 保存工作流数据
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(data));

      // 更新元数据
      const metadataStored = localStorage.getItem(METADATA_KEY);
      let metadata: any[] = [];
      if (metadataStored) {
        metadata = JSON.parse(metadataStored);
      }

      const existingIndex = metadata.findIndex((m) => m.id === id);
      const metadataItem = {
        id,
        name: workflowName(),
        description: "",
        createdAt:
          existingIndex >= 0
            ? metadata[existingIndex].createdAt
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodeCount: nodes().length,
        edgeCount: edges().length,
      };

      if (existingIndex >= 0) {
        metadata[existingIndex] = metadataItem;
      } else {
        metadata.unshift(metadataItem);
      }

      localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error("保存工作流失败:", error);
    }
  };

  // 自动保存（仅在加载完成后生效）
  createEffect(() => {
    // 如果还未加载完成，不执行保存
    if (!isLoaded()) return;
    
    // 当节点或边发生变化时自动保存
    nodes();
    edges();
    workflowName();
    saveWorkflow();
  });

  // 初始化加载
  onMount(() => {
    loadWorkflow();
  });

  const onDragStart = (event: DragEvent, type: string) => {
    if (event.dataTransfer) {
      event.dataTransfer.setData("application/solidflow/type", type);
      event.dataTransfer.effectAllowed = "move";
    }
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    const type = event.dataTransfer?.getData("application/solidflow/type");
    const instance = flowInstance();

    if (!type || !instance) return;

    const position = instance.project({
      x: event.clientX,
      y: event.clientY,
    });

    const id = `${type}-${Date.now()}`;
    let data: any = { label: `New ${type}` };

    if (type === "agent")
      data = { label: "New Agent", role: "Assistant" };
    if (type === "task")
      data = { label: "New Task", description: "Task description..." };
    if (type === "tool") data = { label: "New Tool", description: "Tool..." };
    if (type === "trigger") data = { label: "Start" };

    setNodes((nds) =>
      nds.concat({
        id,
        type,
        position,
        data,
      })
    );
  };

  const selectedNode = () => nodes().find((n) => n.id === selectedNodeId());

  const updateNodeData = (id: string, data: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, ...data } };
        }
        return n;
      })
    );
  };

  const onNodeClick = (_: MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const onNodesChange = (changes: NodeChange[]) =>
    setNodes((nds) => applyNodeChanges(changes, nds));
  const onEdgesChange = (changes: EdgeChange[]) =>
    setEdges((eds) => applyEdgeChanges(changes, eds));
  const onConnect = (connection: Connection) =>
    setEdges((eds) => addEdge(connection, eds));

  const clearGraph = () => {
    if (!confirm("确定要清空画布吗？此操作无法撤销。")) return;
    setNodes([]);
    setEdges([]);
  };

  const exportGraph = () => {
    const data = {
      nodes: nodes(),
      edges: edges(),
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${workflowName() || "workflow"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  let fileInput: HTMLInputElement | undefined;
  const importGraph = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          if (data.nodes && data.edges) {
            setNodes(data.nodes);
            setEdges(data.edges);
          } else {
            alert("无效的工作流文件格式");
          }
        } catch (error) {
          alert("解析 JSON 文件失败");
        }
      };
      reader.readAsText(file);
    }
    target.value = "";
  };

  return (
    <div class="flex h-screen flex-col bg-white">
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInput}
        style={{ display: "none" }}
        accept=".json"
        onChange={importGraph}
      />

      {/* Top Bar */}
      <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/workflow")}
            class="h-8 w-8"
          >
            <ArrowLeft class="h-4 w-4" />
          </Button>
          <Input
            type="text"
            value={workflowName()}
            onInput={(e) => setWorkflowName(e.currentTarget.value)}
            class="w-64 font-semibold border-0 focus-visible:ring-0 text-lg"
            placeholder="工作流名称"
          />
        </div>
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={saveWorkflow}>
            保存
          </Button>
        </div>
      </div>

      {/* Editor Area */}
      <div class="relative flex-1 overflow-hidden">
        <Flow
          nodes={nodes()}
          edges={edges()}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setFlowInstance}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodesDraggable={!isLocked()}
          nodesConnectable={!isLocked()}
          elementsSelectable={!isLocked()}
          panOnDrag={!isLocked()}
          zoomOnScroll={!isLocked()}
          panOnScroll={!isLocked()}
          nodeTypes={{
            agent: AgentNode,
            task: TaskNode,
            trigger: TriggerNode,
            tool: ToolNode,
          }}
          fitView
        >
          <Controls position="bottom-left" />

          {/* Hamburger Menu Panel */}
          <Panel position="top-left" class="m-4">
            <div class="relative">
              <Button
                variant="outline"
                size="icon"
                class="bg-white border-gray-200 shadow-sm hover:bg-gray-50 h-10 w-10 rounded-lg"
                onClick={() => setShowMenu(!showMenu())}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-gray-700"
                >
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </Button>

              <Show when={showMenu()}>
                <div class="absolute top-12 left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex flex-col gap-1 text-sm text-gray-700 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <button
                    onClick={() => fileInput?.click()}
                    class="flex items-center justify-between px-3 py-2 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <div class="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                      </svg>
                      <span>打开</span>
                    </div>
                    <span class="text-xs text-gray-400">Cmd+O</span>
                  </button>
                  <button
                    onClick={exportGraph}
                    class="flex items-center justify-between px-3 py-2 rounded hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-left"
                  >
                    <div class="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" x2="12" y1="15" y2="3" />
                      </svg>
                      <span>导出为 JSON...</span>
                    </div>
                  </button>

                  <div class="h-px bg-gray-100 my-1"></div>

                  <button
                    onClick={clearGraph}
                    class="flex items-center justify-between px-3 py-2 rounded hover:bg-red-50 hover:text-red-700 transition-colors text-left"
                  >
                    <div class="flex items-center gap-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" />
                        <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" />
                        <line x1="10" x2="10" y1="11" y2="17" />
                        <line x1="14" x2="14" y1="11" y2="17" />
                      </svg>
                      <span>清空画布</span>
                    </div>
                  </button>
                </div>
              </Show>
            </div>
          </Panel>

          {/* Floating Toolbar Panel */}
          <Panel position="top-center" class="mt-4">
            <div class="flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
              {/* Lock Button */}
              <div
                class={`p-2 rounded-lg cursor-pointer transition-colors ${
                  isLocked()
                    ? "bg-red-100 text-red-600"
                    : "hover:bg-gray-100 text-gray-500"
                }`}
                title={isLocked() ? "解锁画布" : "锁定画布"}
                onClick={() => setIsLocked(!isLocked())}
              >
                <Show
                  when={isLocked()}
                  fallback={
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect
                        width="18"
                        height="11"
                        x="3"
                        y="11"
                        rx="2"
                        ry="2"
                      />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect
                      width="18"
                      height="11"
                      x="3"
                      y="11"
                      rx="2"
                      ry="2"
                    />
                    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                  </svg>
                </Show>
              </div>

              <div class="w-px h-6 bg-gray-200 mx-1"></div>

              {/* Draggable Nodes */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Agent Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "agent")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" />
                  <path d="M20 14h2" />
                  <path d="M15 13v2" />
                  <path d="M9 13v2" />
                </svg>
              </div>

              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Task Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "task")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <path d="M12 11h4" />
                  <path d="M12 16h4" />
                  <path d="M8 11h.01" />
                  <path d="M8 16h.01" />
                </svg>
              </div>

              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Tool Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "tool")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              </div>

              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Trigger Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "trigger")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m10 8 6 4-6 4V8z" />
                </svg>
              </div>
            </div>
          </Panel>
        </Flow>

        {/* Property Panel Sidebar */}
        <Show when={selectedNode()}>
          {(node) => (
            <div class="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl overflow-y-auto z-40 transition-transform duration-200 ease-in-out">
              <div class="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Show when={node().type === "agent"}>🤖</Show>
                    <Show when={node().type === "task"}>📋</Show>
                    <Show when={node().type === "tool"}>🛠️</Show>
                    <Show when={node().type === "trigger"}>🚀</Show>
                  </div>
                  <div>
                    <h2 class="text-sm font-bold text-gray-900 capitalize">
                      {node().type} 属性
                    </h2>
                    <p class="text-[10px] text-gray-500 font-mono">
                      {node().id}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-8 w-8 text-gray-400 hover:text-gray-700"
                  onClick={() => setSelectedNodeId(null)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </Button>
              </div>

              <div class="p-4 space-y-4">
                {/* Common Fields */}
                <div class="space-y-1.5">
                  <label class="text-xs font-semibold text-gray-700">标签</label>
                  <Input
                    type="text"
                    value={node().data?.label || ""}
                    onInput={(e) =>
                      updateNodeData(node().id, { label: e.currentTarget.value })
                    }
                    class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                  />
                </div>

                {/* Agent Specific */}
                <Show when={node().type === "agent"}>
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700">角色</label>
                    <Input
                      type="text"
                      value={node().data?.role || ""}
                      onInput={(e) =>
                        updateNodeData(node().id, { role: e.currentTarget.value })
                      }
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700">模型</label>
                    <select
                      value={node().data?.model || "GPT-4"}
                      onChange={(e) =>
                        updateNodeData(node().id, { model: e.currentTarget.value })
                      }
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow bg-white"
                    >
                      <option value="GPT-4">GPT-4</option>
                      <option value="GPT-3.5">GPT-3.5</option>
                      <option value="Claude-3">Claude 3</option>
                      <option value="Mistral">Mistral Large</option>
                    </select>
                  </div>
                </Show>

                {/* Task Specific */}
                <Show when={node().type === "task"}>
                  <div class="space-y-1.5">
                    <label class="text-xs font-semibold text-gray-700">描述</label>
                    <textarea
                      value={node().data?.description || ""}
                      onInput={(e) =>
                        updateNodeData(node().id, {
                          description: e.currentTarget.value,
                        })
                      }
                      rows={4}
                      class="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow resize-none"
                    />
                  </div>
                </Show>

                <div class="pt-4 border-t border-gray-100">
                  <h3 class="text-xs font-bold text-gray-900 mb-2">元数据</h3>
                  <div class="grid grid-cols-2 gap-2">
                    <div class="bg-gray-50 p-2 rounded border border-gray-100">
                      <div class="text-[10px] text-gray-400">位置 X</div>
                      <div class="text-xs font-mono text-gray-700">
                        {Math.round(node().position.x)}
                      </div>
                    </div>
                    <div class="bg-gray-50 p-2 rounded border border-gray-100">
                      <div class="text-[10px] text-gray-400">位置 Y</div>
                      <div class="text-xs font-mono text-gray-700">
                        {Math.round(node().position.y)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>
    </div>
  );
};

