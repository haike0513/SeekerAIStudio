/**
 * Workflow / Agent Orchestration Page
 * Features a node-based editor for defining AI agents and their tasks.
 */
import type { Component } from "solid-js";
import { createSignal, Show, onMount, createEffect, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  Flow,
  Panel,
} from "@ensolid/solidflow";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,

  FlowInstance,
} from "@ensolid/solidflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Play,
  Square,
  Terminal,
  Maximize2,
  Minimize2,
  Trash2,
  Filter,
  X,
  Settings,
  Code,
  GitBranch,
  Globe,
  Clock,
  Image as ImageIcon,
  Keyboard,
  CheckCircle,
} from "lucide-solid";
import { SettingsDialog } from "@/components/SettingsDialog";
import { WorkflowPropertyPanel } from "@/components/WorkflowPropertyPanel";
import { getActiveProvider } from "@/lib/store/ai-config";
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

import { AgentNode } from "./nodes/AgentNode";
import { TaskNode } from "./nodes/TaskNode";
import { TriggerNode } from "./nodes/TriggerNode";
import { ScriptNode } from "./nodes/ScriptNode";
import { ConditionNode } from "./nodes/ConditionNode";
import { RequestNode } from "./nodes/RequestNode";
import { DelayNode } from "./nodes/DelayNode";
import { InputNode } from "./nodes/InputNode";
import { ImageGenNode } from "./nodes/ImageGenNode";
import { OutputNode } from "./nodes/OutputNode";



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
  const [showSettings, setShowSettings] = createSignal(false);

  // --- Execution State ---
  const [isRunning, setIsRunning] = createSignal(false);
  const [showOutputPanel, setShowOutputPanel] = createSignal(false);
  const [isOutputExpanded, setIsOutputExpanded] = createSignal(false);
  const [runResult, setRunResult] = createSignal<string | null>(null); // For Output Node
  const [showRunSummary, setShowRunSummary] = createSignal(false);
  
  interface LogEntry {
    id: string;
    timestamp: string;
    nodeId?: string;
    nodeLabel?: string;
    level: 'info' | 'warn' | 'error' | 'success';
    message: string;
    details?: any;
  }
  
  const [logs, setLogs] = createSignal<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = createSignal<'all' | 'error'>('all');

  const filteredLogs = () => {
    if (filterLevel() === 'all') return logs();
    return logs().filter(l => l.level === 'error');
  };

  const addLog = (level: LogEntry['level'], message: string, nodeId?: string, details?: any) => {
    const node = nodeId ? nodes().find(n => n.id === nodeId) : undefined;
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toLocaleTimeString(),
      nodeId,
      nodeLabel: node?.data?.label,
      level,
      message,
      details
    };
    setLogs(prev => [...prev, entry]);
  };

  const runWorkflow = async () => {
    if (isRunning()) {
      setIsRunning(false);
      addLog('warn', 'Execution stopped by user.');
      return;
    }

    const providerConfig = getActiveProvider();
    if (!providerConfig) {
      addLog('error', 'No active AI provided configured. Please check settings.');
      setShowSettings(true);
      return;
    }

    setIsRunning(true);
    setShowOutputPanel(true);
    setLogs([]);
    setRunResult(null);
    addLog('info', `Starting workflow execution with provider: ${providerConfig.name}...`);

    // Helper to update status safely
    const setNodeStatus = (id: string, status: 'running' | 'completed' | 'error' | undefined) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, executionStatus: status } } : n));
    };

    // Reset status
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, executionStatus: undefined } })));

    // Create AI Client based on config
    const openai = createOpenAI({
      baseURL: providerConfig.baseUrl,
      apiKey: providerConfig.apiKey || 'not-needed-for-ollama',
      // For localhost/custom domains in browser environment
      fetch: window.fetch.bind(window) 
    });

     try {
      // Find trigger nodes
      const startNodes = nodes().filter((n) => n.type === "trigger");

      if (startNodes.length === 0) {
        addLog("warn", 'No trigger node found. Please add a "Start" node.');
        setIsRunning(false);
        return;
      }

      const queue = [...startNodes];

      // Context to pass data between nodes
      const context: Record<string, any> = {
         // Global helpers
         timestamp: Date.now(),
      }; 

      const getInputs = (nodeId: string) => {
          const incomingEdges = edges().filter(e => e.target === nodeId);
          // Return a map of { sourceNodeId: output }
          // Or simpler: just the text content joined
          return incomingEdges.map(e => context[e.source]).filter(v => v !== undefined);
      };

      const getPrevOutput = (nodeId: string) => {
         const inputs = getInputs(nodeId);
         if (inputs.length === 0) return "";
         if (inputs.length === 1) return inputs[0];
         return typeof inputs[inputs.length - 1] === 'string' ? inputs[inputs.length - 1] : JSON.stringify(inputs[inputs.length - 1]);
      };
      
      let stepCount = 0;
      const MAX_STEPS = 50; // Prevent infinite loops

      while (queue.length > 0 && isRunning()) {
        if (stepCount++ > MAX_STEPS) {
           addLog("error", "Max execution steps exceeded. Possible infinite loop.");
           break;
        }

        const currentNode = queue.shift()!;
        
        // Loop detection: allow re-visiting for loops, but maybe we need smarter handling.
        // For DAGs, we usually wait for all inputs. For now, simple BFS.

        setNodeStatus(currentNode.id, "running");
        addLog("info", `Running ${currentNode.type}: ${currentNode.data.label}`, currentNode.id);

        try {
          let output: any = null;
          let nextNodeIds: string[] = [];

          // --- EXECUTION SWITCH ---
          switch (currentNode.type) {
            case "agent": {
                addLog('info', `Agent ${currentNode.id} thinking...`, currentNode.id);

                // Prompt Template Processing
                const input = getPrevOutput(currentNode.id); // Get input from previous node
                let promptContent = typeof input === 'string' ? input : JSON.stringify(input);

                if (currentNode.data.userPromptTemplate) {
                  // Basic template engine: replace {{input}} with actual input
                  // We can extend this to support more context variables later
                  promptContent = currentNode.data.userPromptTemplate.replace(
                    /\{\{input\}\}/g,
                    promptContent
                  );
                }

                // Call AI SDK
                const { textStream } = await streamText({
                  model: openai(currentNode.data.model || 'gpt-4'),
                  messages: [
                    { role: "system", content: currentNode.data.role || "You are a helpful assistant." },
                    { role: "user", content: promptContent }
                  ]
                });
                
                let text = '';
                for await (const chunk of textStream) {
                   text += chunk;
                   // Optional: Live update node status or show partial output?
                   // managing live state update for every token might be heavy, 
                   // maybe update every N chars or simple use final result
                }
                
                output = text;
                addLog('success', `Agent completed.`, currentNode.id, { outputLength: text.length });
                break;
            }
            case "script": {
               // Safe-ish eval using new Function
               const code = currentNode.data.code || "return 'No code provided';";
               const prev = getPrevOutput(currentNode.id);
               // Exposed variables: input, context, console (mocked)
               const scriptFunc = new Function('input', 'context', 'console', `
                  try { 
                    ${code} 
                  } catch(e) { return "Script Error: " + e.message; }
               `);
               
               const mockConsole = {
                  log: (msg: string) => addLog("info", `[Script Log]: ${msg}`, currentNode.id)
               };
               
               output = scriptFunc(prev, context, mockConsole);
               addLog("success", `Script executed. Output type: ${typeof output}`, currentNode.id);
               break;
            }

            case "condition": {
               const expr = currentNode.data.expression || "true";
               const input = getPrevOutput(currentNode.id);
               // Simple eval for condition
               // e.g. "input.includes('error')"
               const checkFunc = new Function('input', `return ${expr}`);
               let isTrue = false;
               try {
                  isTrue = !!checkFunc(input);
               } catch (e) {
                  addLog("error", `Condition failed: ${e}`, currentNode.id);
               }
               
               addLog("info", `Condition checked: ${isTrue}`, currentNode.id);
               
               // Route based on handle IDs
               const outEdges = edges().filter(e => e.source === currentNode.id);
               const trueEdges = outEdges.filter(e => e.sourceHandle === 'true');
               const falseEdges = outEdges.filter(e => e.sourceHandle === 'false');
               
               if (isTrue) nextNodeIds = trueEdges.map(e => e.target);
               else nextNodeIds = falseEdges.map(e => e.target);
               
               // Skip standard next node finding
               output = isTrue; // store for debugging
               break;
            }
            
            case "request": {
                const url = currentNode.data.url;
                if (!url) throw new Error("URL is required");
                const method = currentNode.data.method || "GET";
                const body = currentNode.data.body ? JSON.parse(currentNode.data.body) : undefined;
                
                addLog("info", `${method} ${url}`, currentNode.id);
                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: body ? JSON.stringify(body) : undefined
                });
                const json = await res.json();
                output = json;
                break;
            }

            case "delay": {
                const duration = parseInt(currentNode.data.duration || "1000", 10);
                addLog("info", `Waiting for ${duration}ms...`, currentNode.id);
                await new Promise(r => setTimeout(r, duration));
                output = "Delayed";
                break;
            }

            case "input": {
                // For now, using window.prompt as a simple blocking input
                const promptText = currentNode.data.prompt || "Please enter a value:";
                // In a real app, this should be a non-blocking UI modal, which pauses execution loop
                // But since our loop is async, we can yield. 
                // However, window.prompt is blocking which is easiest for MVP 
                const userInput = window.prompt(promptText, "");
                if (userInput === null) {
                   throw new Error("User cancelled input");
                }
                output = userInput;
                addLog("success", `User input received: ${userInput}`, currentNode.id);
                break;
            }
            
            case "image-gen": {
               // Mock Image Generation
               const prompt = currentNode.data.prompt;
               if (!prompt) throw new Error("Prompt is required");
               
               addLog("info", `Generating image for: "${prompt}"...`, currentNode.id);
               // Simulate API call delay
               await new Promise(r => setTimeout(r, 2000));
               
               // Return a placeholder image URL for now
               const mockImageUrl = `https://placehold.co/600x400?text=${encodeURIComponent(prompt.substring(0, 20))}`;
               output = mockImageUrl;
               addLog("success", "Image generated successfully", currentNode.id, { url: mockImageUrl });
               break;
            }

            case "output": {
               const prev = getPrevOutput(currentNode.id);
               setRunResult(typeof prev === 'string' ? prev : JSON.stringify(prev, null, 2));
               addLog("success", "Final Output reached!", currentNode.id);
               // We don't stop here, but usually output node is a leaf
               output = prev;
               break;
            }
            
            default: // trigger, task, etc
               await new Promise(r => setTimeout(r, 200));
               output = currentNode.data.label;
          }
          
          if (!isRunning()) break;
          
          context[currentNode.id] = output;
          updateNodeData(currentNode.id, { lastOutput: typeof output === 'object' ? JSON.stringify(output) : output });
          setNodeStatus(currentNode.id, "completed");

          // Standard flow: find next nodes if not already handled (like by Condition)
          if (currentNode.type !== "condition") {
             const outgoingEdges = edges().filter((e) => e.source === currentNode.id);
             for (const edge of outgoingEdges) {
               nextNodeIds.push(edge.target);
             }
          }
          
          // Add next nodes to queue
          for (const nid of nextNodeIds) {
             const node = nodes().find(n => n.id === nid);
             if (node) queue.push(node);
          }

        } catch (nodeError: any) {
            setNodeStatus(currentNode.id, "error");
            addLog("error", `Failed: ${nodeError.message}`, currentNode.id);
            // Stop on error? 
            // setIsRunning(false); break; 
        }
      }

      if (isRunning()) {
        addLog("success", "Workflow execution completed successfully.");
        if (runResult()) {
            setShowRunSummary(true);
        }
      }
    } catch (e: any) {
      addLog("error", `Execution failed: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

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
      data = { label: "New Agent", role: "Assistant", model: "gpt-4o" };
    if (type === "script")
      data = { label: "Transform Data", code: "return input.toUpperCase();" };
    if (type === "condition")
      data = { label: "Check Input", expression: "Number(input) > 0" };
    if (type === "request")
      data = { label: "Fetch API", method: "GET", url: "https://jsonplaceholder.typicode.com/todos/1" };
    if (type === "delay") data = { label: "Wait", duration: "1000" };
    if (type === "input") data = { label: "User Input", prompt: "Please enter data..." };
    if (type === "image-gen") data = { label: "AI Art", prompt: "A futuristic city...", size: "1024x1024" };
    if (type === "output") data = { label: "Show Result" };
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
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)} title="AI Settings">
               <Settings class="h-5 w-5 text-gray-600" />
          </Button>
          <div class="w-px h-6 bg-gray-200 mx-2"></div>
          <Button variant="outline" size="sm" onClick={saveWorkflow}>
            保存
          </Button>
          <div class="w-px h-6 bg-gray-200 mx-2"></div>
          <Button 
            variant={isRunning() ? "destructive" : "default"} 
            size="sm" 
            onClick={runWorkflow}
            class="gap-2"
          >
            <Show when={isRunning()} fallback={<><Play class="h-4 w-4" /> 运行</>}>
              <Square class="h-4 w-4 fill-current" /> 停止
            </Show>
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
            script: ScriptNode,
            condition: ConditionNode,
            request: RequestNode,
            trigger: TriggerNode,
            delay: DelayNode,
            input: InputNode,
            "image-gen": ImageGenNode,
            output: OutputNode,
          }}
          fitView
        >
          <Controls position="bottom-left" />
          
          {/* Execution Output Panel */}
          <Show when={showOutputPanel()}>
            <div 
              class={`absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-all duration-300 flex flex-col z-50 ${
                isOutputExpanded() ? "h-[60vh]" : "h-48"
              }`}
            >
              {/* Panel Header */}
              <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/80 backdrop-blur">
                <div class="flex items-center gap-2">
                  <Terminal class="h-4 w-4 text-gray-500" />
                  <span class="text-xs font-bold text-gray-700 uppercase tracking-wider">Execution Log</span>
                  <div class="flex items-center gap-1 ml-4">
                    <span class="px-1.5 py-0.5 rounded-full bg-gray-200 text-[10px] text-gray-600 font-mono">
                      {logs().length} lines
                    </span>
                    <Show when={isRunning()}>
                      <span class="flex h-2 w-2 relative">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    </Show>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <Button 
                    variant={filterLevel() === 'error' ? "secondary" : "ghost"} 
                    size="icon" 
                    class="h-6 w-6" 
                    title="Toggle Error Filter"
                    onClick={() => setFilterLevel(filterLevel() === 'all' ? 'error' : 'all')}
                  >
                    <Filter class={`h-3.5 w-3.5 ${filterLevel() === 'error' ? 'text-red-500' : 'text-gray-500'}`} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6" 
                    title="Clear Logs"
                    onClick={() => setLogs([])}
                  >
                    <Trash2 class="h-3.5 w-3.5 text-gray-500" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6" 
                    title={isOutputExpanded() ? "Collapse" : "Expand"}
                    onClick={() => setIsOutputExpanded(!isOutputExpanded())}
                  >
                    <Show when={isOutputExpanded()} fallback={<Maximize2 class="h-3.5 w-3.5 text-gray-500" />}>
                      <Minimize2 class="h-3.5 w-3.5 text-gray-500" />
                    </Show>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    class="h-6 w-6" 
                    onClick={() => setShowOutputPanel(false)}
                  >
                    <X class="h-3.5 w-3.5 text-gray-500" />
                  </Button>
                </div>
              </div>
              
              {/* Logs Content */}
              <div class="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                <For each={filteredLogs()}>
                  {(log) => (
                    <div class={`flex gap-2 p-1 rounded hover:bg-gray-50 ${
                      log.level === 'error' ? 'text-red-600 bg-red-50/50' :
                      log.level === 'warn' ? 'text-amber-600 bg-amber-50/50' :
                      log.level === 'success' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      <span class="text-gray-400 shrink-0 select-none">[{log.timestamp}]</span>
                      <Show when={log.nodeLabel}>
                        <span class="font-bold shrink-0 px-1 bg-gray-100 rounded text-gray-700 h-fit">
                          {log.nodeLabel}
                        </span>
                      </Show>
                      <span class="break-all">{log.message}</span>
                    </div>
                  )}
                </For>
                <Show when={logs().length === 0}>
                  <div class="text-gray-400 text-center italic mt-4">
                    Ready to execute. Click "Run" to start.
                  </div>
                </Show>
              </div>
            </div>
          </Show>

          <SettingsDialog open={showSettings()} onOpenChange={setShowSettings} />

          {/* RIGHT PROPERTY PANEL */}
          <Show when={selectedNode()}>
            {(node) => (
              <div class="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden z-20 animate-in slide-in-from-right-4 duration-200">
                <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                   <div class="flex items-center gap-2">
                     <span class="font-semibold text-sm text-gray-800">Properties</span>
                     <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                       {node().type}
                     </span>
                   </div>
                   <Button variant="ghost" size="icon" class="h-6 w-6" onClick={() => setSelectedNodeId(null)}>
                     <X class="h-4 w-4" />
                   </Button>
                </div>
                
                <div class="p-4 space-y-4 overflow-y-auto flex-1">
                   <div class="space-y-1">
                      <Label class="text-xs">Label</Label>
                      <input 
                        class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={node().data.label}
                        onInput={(e) => updateNodeData(node().id, { label: e.currentTarget.value })}
                      />
                   </div>

                   {/* Agent Specific */}
                   <Show when={node().type === 'agent'}>
                      <div class="space-y-1">
                        <Label class="text-xs">Model</Label>
                        <Select 
                           value={node().data.model} 
                           onChange={(v) => updateNodeData(node().id, { model: v })}
                           options={["gpt-4o", "gpt-3.5-turbo", "llama3"]} 
                           itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
                        >
                           <SelectTrigger class="w-full">
                              <SelectValue<string>>{state => state.selectedOption()}</SelectValue>
                           </SelectTrigger>
                           <SelectContent />
                        </Select>
                      </div>
                      <div class="space-y-1">
                        <Label class="text-xs">Role / System Prompt</Label>
                        <Textarea 
                          value={node().data.role}
                          class="min-h-[100px] font-sans text-xs"
                          onInput={(e) => updateNodeData(node().id, { role: e.currentTarget.value })}
                        />
                      </div>
                   </Show>

                   {/* Script Specific */}
                   <Show when={node().type === 'script'}>
                      <div class="space-y-1">
                        <Label class="text-xs">JavaScript Code</Label>
                         <p class="text-[10px] text-gray-400 mb-1">Available vars: <code>input</code>, <code>context</code></p>
                        <Textarea 
                          value={node().data.code}
                          class="min-h-[150px] font-mono text-xs bg-slate-50"
                          onInput={(e) => updateNodeData(node().id, { code: e.currentTarget.value })}
                        />
                      </div>
                   </Show>
                   
                   {/* Condition Specific */}
                   <Show when={node().type === 'condition'}>
                      <div class="space-y-1">
                        <Label class="text-xs">Expression (JS)</Label>
                        <p class="text-[10px] text-gray-400 mb-1">Return true/false based on <code>input</code></p>
                        <input 
                          class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                          value={node().data.expression}
                          onInput={(e) => updateNodeData(node().id, { expression: e.currentTarget.value })}
                        />
                      </div>
                   </Show>

                   {/* Request Specific */}
                   <Show when={node().type === 'request'}>
                      <div class="space-y-1">
                         <Label class="text-xs">Method</Label>
                         <Select 
                           value={node().data.method} 
                           onChange={(v) => updateNodeData(node().id, { method: v })}
                           options={["GET", "POST", "PUT", "DELETE"]} 
                           itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
                        >
                           <SelectTrigger class="w-full">
                              <SelectValue<string>>{state => state.selectedOption()}</SelectValue>
                           </SelectTrigger>
                           <SelectContent />
                        </Select>
                      </div>
                      <div class="space-y-1">
                        <Label class="text-xs">URL</Label>
                        <input 
                          class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={node().data.url}
                          onInput={(e) => updateNodeData(node().id, { url: e.currentTarget.value })}
                        />
                      </div>
                      <Show when={node().data.method !== 'GET'}>
                        <div class="space-y-1">
                            <Label class="text-xs">Body (JSON)</Label>
                            <Textarea 
                            value={node().data.body}
                            class="min-h-[100px] font-mono text-xs"
                            placeholder="{}"
                            onInput={(e) => updateNodeData(node().id, { body: e.currentTarget.value })}
                            />
                        </div>
                      </Show>
                   </Show>

                   {/* Delay Specific */}
                   <Show when={node().type === 'delay'}>
                      <div class="space-y-1">
                        <Label class="text-xs">Duration (ms)</Label>
                        <input 
                          type="number"
                          class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={node().data.duration}
                          onInput={(e) => updateNodeData(node().id, { duration: e.currentTarget.value })}
                        />
                      </div>
                   </Show>

                   {/* Input Specific */}
                   <Show when={node().type === 'input'}>
                      <div class="space-y-1">
                        <Label class="text-xs">Prompt Message</Label>
                        <Textarea 
                          value={node().data.prompt}
                          class="min-h-[80px] font-sans text-xs"
                          placeholder="What do you want to ask the user?"
                          onInput={(e) => updateNodeData(node().id, { prompt: e.currentTarget.value })}
                        />
                      </div>
                   </Show>

                   {/* Image Gen Specific */}
                   <Show when={node().type === 'image-gen'}>
                      <div class="space-y-1">
                        <Label class="text-xs">Image Prompt</Label>
                        <Textarea 
                          value={node().data.prompt}
                          class="min-h-[80px] font-sans text-xs"
                          placeholder="Describe the image..."
                          onInput={(e) => updateNodeData(node().id, { prompt: e.currentTarget.value })}
                        />
                      </div>
                      <div class="space-y-1">
                         <Label class="text-xs">Size</Label>
                         <Select 
                           value={node().data.size} 
                           onChange={(v) => updateNodeData(node().id, { size: v })}
                           options={["256x256", "512x512", "1024x1024"]} 
                           itemComponent={(props) => <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>}
                        >
                           <SelectTrigger class="w-full">
                              <SelectValue<string>>{state => state.selectedOption()}</SelectValue>
                           </SelectTrigger>
                           <SelectContent />
                        </Select>
                      </div>
                   </Show>

                   {/* Debug Output */}
                   <div class="pt-4 border-t mt-4">
                      <Label class="text-xs text-gray-500 mb-1 block">Last Execution Output</Label>
                      <div class="bg-gray-100 p-2 rounded text-[10px] font-mono max-h-32 overflow-y-auto break-all">
                        {node().data.lastOutput || "No output yet"}
                      </div>
                   </div>
                </div>
              </div>
            )}
          </Show>

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

               <div class="w-px h-6 bg-gray-200 mx-1"></div>

              {/* Script Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Script Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "script")}
              >
                  <Code class="h-4 w-4" />
              </div>

              {/* Condition Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Condition Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "condition")}
              >
                  <GitBranch class="h-4 w-4" />
              </div>

              {/* Request Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Request Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "request")}
              >
                  <Globe class="h-4 w-4" />
              </div>

               <div class="w-px h-6 bg-gray-200 mx-1"></div>

               {/* Delay Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Delay Node"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "delay")}
              >
                  <Clock class="h-4 w-4" />
              </div>

               {/* Input Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Human Input"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "input")}
              >
                  <Keyboard class="h-4 w-4" />
              </div>

              {/* Image Gen Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="AI Drawing"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "image-gen")}
              >
                  <ImageIcon class="h-4 w-4" />
              </div>

               {/* Output Node Icon */}
              <div
                class="p-2 rounded-lg hover:bg-gray-100 text-gray-700 cursor-grab active:cursor-grabbing relative group transition-colors"
                title="Final Output"
                draggable={true}
                onDragStart={(e) => onDragStart(e, "output")}
              >
                  <CheckCircle class="h-4 w-4" />
              </div>

            </div>
          </Panel>

          {/* RUN SUMMARY DIALOG */}
          <Dialog open={showRunSummary()} onOpenChange={setShowRunSummary}>
              <DialogContent>
                  <DialogHeader>
                      <DialogTitle>Workflow Complete</DialogTitle>
                      <DialogDescription>
                          The workflow finished successfully. Here is the final output from the Output Node.
                      </DialogDescription>
                  </DialogHeader>
                  <div class="p-4 bg-slate-50 rounded-md border border-slate-200 mt-2 max-h-[300px] overflow-y-auto">
                      <pre class="text-xs font-mono whitespace-pre-wrap break-all text-slate-800">
                          {runResult()}
                      </pre>
                  </div>
                  <DialogFooter>
                      <Button onClick={() => setShowRunSummary(false)}>Close</Button>
                  </DialogFooter>
              </DialogContent>
          </Dialog>
        </Flow>

        {/* Property Panel Sidebar */}
        <Show when={selectedNodeId()}>
            <WorkflowPropertyPanel
                selectedNode={nodes().find((n) => n.id === selectedNodeId()) || null}
                onClose={() => setSelectedNodeId(null)}
                onUpdateNodeData={updateNodeData}
            />
        </Show>



      </div>
    </div>
  );
};

