import { createSignal, For, Show } from "solid-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Edit2, Play, Save } from "lucide-solid";

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  type: "inference" | "transform" | "output";
  config: Record<string, any>;
}

export default function WorkflowPage() {
  const { t } = useI18n();
  const [workflows, setWorkflows] = createSignal<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = createSignal<Workflow | null>(null);
  const [isCreating, setIsCreating] = createSignal(false);
  const [newWorkflowName, setNewWorkflowName] = createSignal("");
  const [newWorkflowDescription, setNewWorkflowDescription] = createSignal("");

  // 创建新工作流
  const handleCreateWorkflow = () => {
    if (!newWorkflowName().trim()) return;

    const newWorkflow: Workflow = {
      id: `workflow-${Date.now()}`,
      name: newWorkflowName(),
      description: newWorkflowDescription(),
      steps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setWorkflows([...workflows(), newWorkflow]);
    setNewWorkflowName("");
    setNewWorkflowDescription("");
    setIsCreating(false);
    setSelectedWorkflow(newWorkflow);
  };

  // 删除工作流
  const handleDeleteWorkflow = (id: string) => {
    setWorkflows(workflows().filter((w) => w.id !== id));
    if (selectedWorkflow()?.id === id) {
      setSelectedWorkflow(null);
    }
  };

  // 运行工作流
  const handleRunWorkflow = (workflow: Workflow) => {
    // TODO: 实现工作流运行逻辑
    console.log("运行工作流:", workflow);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold">{t("workflow.title")}</h1>
          <p class="text-muted-foreground mt-1">{t("workflow.description")}</p>
        </div>
        <Button
          onClick={() => setIsCreating(true)}
          class="gap-2"
        >
          <Plus class="h-4 w-4" />
          {t("workflow.create")}
        </Button>
      </div>

      <Separator />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 工作流列表 */}
        <div class="lg:col-span-1 space-y-4">
          <h2 class="text-lg font-semibold">{t("workflow.workflowList")}</h2>
          
          {/* 创建新工作流表单 */}
          <Show when={isCreating()}>
            <Card>
              <CardHeader>
                <CardTitle class="text-base">{t("workflow.newWorkflow")}</CardTitle>
              </CardHeader>
              <CardContent class="space-y-4">
                <div class="space-y-2">
                  <Label>{t("workflow.name")}</Label>
                  <Input
                    value={newWorkflowName()}
                    onInput={(e) => setNewWorkflowName(e.currentTarget.value)}
                    placeholder={t("workflow.placeholder.name")}
                  />
                </div>
                <div class="space-y-2">
                  <Label>{t("workflow.descriptionLabel")}</Label>
                  <Input
                    value={newWorkflowDescription()}
                    onInput={(e) => setNewWorkflowDescription(e.currentTarget.value)}
                    placeholder={t("workflow.placeholder.description")}
                  />
                </div>
                <div class="flex gap-2">
                  <Button
                    onClick={handleCreateWorkflow}
                    size="sm"
                    class="flex-1"
                    disabled={!newWorkflowName().trim()}
                  >
                    <Save class="h-4 w-4 mr-2" />
                    {t("workflow.save")}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setNewWorkflowName("");
                      setNewWorkflowDescription("");
                    }}
                    variant="outline"
                    size="sm"
                  >
                    {t("workflow.cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Show>

          {/* 工作流列表 */}
          <div class="space-y-2">
            <Show
              when={workflows().length > 0}
              fallback={
                <Card>
                  <CardContent class="pt-6">
                    <p class="text-sm text-muted-foreground text-center">
                      {t("workflow.noWorkflows")}
                    </p>
                  </CardContent>
                </Card>
              }
            >
              <For each={workflows()}>
                {(workflow) => (
                  <Card
                    class={cn(
                      "cursor-pointer transition-colors",
                      selectedWorkflow()?.id === workflow.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                    onClick={() => setSelectedWorkflow(workflow)}
                  >
                    <CardContent class="p-4">
                      <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                          <h3 class="font-semibold truncate">{workflow.name}</h3>
                          <p class="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {workflow.description || t("workflow.noDescription")}
                          </p>
                          <p class="text-xs text-muted-foreground mt-2">
                            {workflow.steps.length} {t("workflow.steps")}
                          </p>
                        </div>
                        <div class="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunWorkflow(workflow);
                            }}
                            title={t("workflow.run")}
                          >
                            <Play class="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            class="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkflow(workflow.id);
                            }}
                            title={t("workflow.delete")}
                          >
                            <Trash2 class="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </For>
            </Show>
          </div>
        </div>

        {/* 工作流详情 */}
        <div class="lg:col-span-2 space-y-4">
          <Show
            when={selectedWorkflow()}
            fallback={
              <Card>
                <CardContent class="pt-6">
                  <div class="text-center py-12">
                    <p class="text-muted-foreground">
                      {t("workflow.selectWorkflow")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            }
          >
            {(workflow) => (
              <div class="space-y-4">
                <Card>
                  <CardHeader>
                    <div class="flex items-center justify-between">
                      <div>
                        <CardTitle>{workflow().name}</CardTitle>
                        <CardDescription class="mt-1">
                          {workflow().description || t("workflow.noDescription")}
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => handleRunWorkflow(workflow())}
                        class="gap-2"
                      >
                        <Play class="h-4 w-4" />
                        {t("workflow.run")}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div class="space-y-4">
                      <div>
                        <Label class="text-sm font-medium">
                          {t("workflow.steps")} ({workflow().steps.length})
                        </Label>
                        <Show
                          when={workflow().steps.length > 0}
                          fallback={
                            <Card class="mt-2">
                              <CardContent class="pt-6">
                                <p class="text-sm text-muted-foreground text-center">
                                  {t("workflow.noSteps")}
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  class="mt-4 w-full gap-2"
                                  onClick={() => {
                                    // TODO: 添加步骤
                                    console.log("添加步骤");
                                  }}
                                >
                                  <Plus class="h-4 w-4" />
                                  {t("workflow.addStep")}
                                </Button>
                              </CardContent>
                            </Card>
                          }
                        >
                          <div class="mt-2 space-y-2">
                            <For each={workflow().steps}>
                              {(step) => (
                                <Card>
                                  <CardContent class="p-4">
                                    <div class="flex items-center justify-between">
                                      <div>
                                        <h4 class="font-medium">{step.name}</h4>
                                        <p class="text-sm text-muted-foreground">
                                          {t(`workflow.stepTypes.${step.type}`)}
                                        </p>
                                      </div>
                                      <div class="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          class="h-8 w-8"
                                          title={t("workflow.edit")}
                                        >
                                          <Edit2 class="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          class="h-8 w-8 text-destructive hover:text-destructive"
                                          title={t("workflow.delete")}
                                        >
                                          <Trash2 class="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </For>
                            <Button
                              variant="outline"
                              size="sm"
                              class="w-full gap-2"
                              onClick={() => {
                                // TODO: 添加步骤
                                console.log("添加步骤");
                              }}
                            >
                              <Plus class="h-4 w-4" />
                              {t("workflow.addStep")}
                            </Button>
                          </div>
                        </Show>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}

