import { createSignal, For, Show, createMemo } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { Plus, Search, Trash2, Edit2, Calendar, FileText } from "lucide-solid";

export interface WorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
  edgeCount?: number;
}

const ITEMS_PER_PAGE = 12;
const STORAGE_KEY = "workflows_metadata";

export default function WorkflowListPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  
  const [workflows, setWorkflows] = createSignal<WorkflowMetadata[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [currentPage, setCurrentPage] = createSignal(1);

  // 从 localStorage 加载工作流列表
  const loadWorkflows = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as WorkflowMetadata[];
        setWorkflows(data);
      }
    } catch (error) {
      console.error("加载工作流列表失败:", error);
    }
  };

  // 初始化时加载
  loadWorkflows();

  // 过滤后的工作流
  const filteredWorkflows = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return workflows();
    
    return workflows().filter(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.description?.toLowerCase().includes(query)
    );
  });

  // 分页计算
  const totalPages = createMemo(() =>
    Math.ceil(filteredWorkflows().length / ITEMS_PER_PAGE)
  );

  const paginatedWorkflows = createMemo(() => {
    const start = (currentPage() - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredWorkflows().slice(start, end);
  });

  // 创建新工作流
  const handleCreateWorkflow = () => {
    const newId = `workflow-${Date.now()}`;
    const now = new Date().toISOString();
    
    const newWorkflow: WorkflowMetadata = {
      id: newId,
      name: "未命名工作流",
      description: "",
      createdAt: now,
      updatedAt: now,
      nodeCount: 0,
      edgeCount: 0,
    };

    // 保存到 localStorage
    const updated = [newWorkflow, ...workflows()];
    setWorkflows(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 导航到编辑页面
    navigate(`/workflow/${newId}`);
  };

  // 删除工作流
  const handleDeleteWorkflow = (id: string, event: MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm("确定要删除这个工作流吗？此操作无法撤销。")) {
      return;
    }

    // 从列表中移除
    const updated = workflows().filter((w) => w.id !== id);
    setWorkflows(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 删除工作流数据
    try {
      localStorage.removeItem(`workflow_${id}`);
    } catch (error) {
      console.error("删除工作流数据失败:", error);
    }

    // 如果当前页没有数据了，回到上一页
    if (paginatedWorkflows().length === 1 && currentPage() > 1) {
      setCurrentPage(currentPage() - 1);
    }
  };

  // 编辑工作流
  const handleEditWorkflow = (id: string) => {
    navigate(`/workflow/${id}`);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "今天";
    } else if (days === 1) {
      return "昨天";
    } else if (days < 7) {
      return `${days} 天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{t("workflow.title")}</h1>
          <p class="text-muted-foreground mt-1">{t("workflow.description")}</p>
        </div>
        <Button onClick={handleCreateWorkflow} class="gap-2">
          <Plus class="h-4 w-4" />
          {t("workflow.create")}
        </Button>
      </div>

      {/* Search Bar */}
      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索工作流..."
          value={searchQuery()}
          onInput={(e) => {
            setSearchQuery(e.currentTarget.value);
            setCurrentPage(1); // 重置到第一页
          }}
          class="pl-9"
        />
      </div>

      {/* Workflow Grid */}
      <Show
        when={filteredWorkflows().length > 0}
        fallback={
          <Card>
            <CardContent class="pt-6">
              <div class="text-center py-12">
                <FileText class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p class="text-muted-foreground">
                  {searchQuery()
                    ? "没有找到匹配的工作流"
                    : "暂无工作流，点击上方按钮创建一个"}
                </p>
              </div>
            </CardContent>
          </Card>
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <For each={paginatedWorkflows()}>
            {(workflow) => (
              <Card
                class="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                onClick={() => handleEditWorkflow(workflow.id)}
              >
                <CardHeader>
                  <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0">
                      <CardTitle class="text-lg truncate">{workflow.name}</CardTitle>
                      <CardDescription class="mt-1 line-clamp-2">
                        {workflow.description || "无描述"}
                      </CardDescription>
                    </div>
                    <div class="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditWorkflow(workflow.id);
                        }}
                        title="编辑"
                      >
                        <Edit2 class="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteWorkflow(workflow.id, e)}
                        title="删除"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div class="flex items-center justify-between text-sm text-muted-foreground">
                    <div class="flex items-center gap-4">
                      <div class="flex items-center gap-1">
                        <span>节点: {workflow.nodeCount || 0}</span>
                      </div>
                      <div class="flex items-center gap-1">
                        <span>连接: {workflow.edgeCount || 0}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <Calendar class="h-3 w-3" />
                      <span>{formatDate(workflow.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </For>
        </div>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div class="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage() === 1}
            >
              上一页
            </Button>
            <div class="flex items-center gap-1">
              <span class="text-sm text-muted-foreground">
                第 {currentPage()} / {totalPages()} 页
              </span>
              <span class="text-sm text-muted-foreground">
                （共 {filteredWorkflows().length} 个工作流）
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages(), p + 1))}
              disabled={currentPage() === totalPages()}
            >
              下一页
            </Button>
          </div>
        </Show>
      </Show>
    </div>
  );
}

