/**
 * Ollama 模型管理组件
 * 
 * 显示 Ollama 服务状态和本地模型列表
 */

import { Component, Show, For, createSignal } from "solid-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    RefreshCw,
    Download,
    Trash2,
    CheckCircle2,
    XCircle,
    HardDrive,
    AlertCircle,
    Loader2,
} from "lucide-solid";
import { useOllama, formatModelSize, parseModelName, type OllamaModel } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface OllamaManagerProps {
    class?: string;
}

export const OllamaManager: Component<OllamaManagerProps> = (props) => {
    const ollama = useOllama({ pollInterval: 30000 }); // 每 30 秒自动刷新

    const [pullModelName, setPullModelName] = createSignal("");
    const [pullProgress, setPullProgress] = createSignal<number | null>(null);
    const [isPulling, setIsPulling] = createSignal(false);

    const handlePullModel = async () => {
        const modelName = pullModelName().trim();
        if (!modelName) return;

        setIsPulling(true);
        setPullProgress(0);

        try {
            await ollama.pullModel(modelName, (progress) => {
                setPullProgress(progress);
            });
            setPullModelName("");
        } catch (err) {
            console.error("拉取模型失败:", err);
        } finally {
            setIsPulling(false);
            setPullProgress(null);
        }
    };

    const handleDeleteModel = async (modelName: string) => {
        if (!confirm(`确定要删除模型 "${modelName}" 吗？`)) return;

        try {
            await ollama.deleteModel(modelName);
        } catch (err) {
            console.error("删除模型失败:", err);
        }
    };

    return (
        <Card class={cn("", props.class)}>
            <CardHeader>
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <HardDrive class="w-5 h-5" />
                        <div>
                            <CardTitle class="text-lg">Ollama 本地模型</CardTitle>
                            <CardDescription>管理本地运行的 Ollama 模型</CardDescription>
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        {/* 状态指示 */}
                        <Show
                            when={ollama.status().available}
                            fallback={
                                <Badge variant="destructive" class="gap-1">
                                    <XCircle class="w-3 h-3" />
                                    离线
                                </Badge>
                            }
                        >
                            <Badge variant="default" class="gap-1 bg-green-600">
                                <CheckCircle2 class="w-3 h-3" />
                                在线
                                <Show when={ollama.status().version}>
                                    <span class="opacity-70 ml-1">v{ollama.status().version}</span>
                                </Show>
                            </Badge>
                        </Show>

                        {/* 刷新按钮 */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => ollama.checkStatus()}
                            disabled={ollama.isLoading()}
                        >
                            <RefreshCw class={cn("w-4 h-4", ollama.isLoading() && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent class="space-y-4">
                {/* 错误提示 */}
                <Show when={ollama.error()}>
                    <div class="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                        <AlertCircle class="w-4 h-4 shrink-0" />
                        <span class="text-sm">{ollama.error()}</span>
                    </div>
                </Show>

                {/* 离线提示 */}
                <Show when={!ollama.status().available && !ollama.error()}>
                    <div class="text-center py-8 text-muted-foreground">
                        <XCircle class="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p class="font-medium">Ollama 服务未运行</p>
                        <p class="text-sm mt-1">
                            请先安装并启动 Ollama 服务
                        </p>
                        <Button
                            variant="outline"
                            class="mt-4"
                            onClick={() => window.open("https://ollama.ai", "_blank")}
                        >
                            前往 Ollama 官网
                        </Button>
                    </div>
                </Show>

                {/* 服务在线时显示 */}
                <Show when={ollama.status().available}>
                    {/* 拉取新模型 */}
                    <div class="space-y-2">
                        <label class="text-sm font-medium">拉取新模型</label>
                        <div class="flex gap-2">
                            <Input
                                placeholder="输入模型名称 (如: llama3.2, qwen2.5:7b)"
                                value={pullModelName()}
                                onInput={(e) => setPullModelName(e.currentTarget.value)}
                                disabled={isPulling()}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handlePullModel();
                                }}
                            />
                            <Button
                                onClick={handlePullModel}
                                disabled={!pullModelName().trim() || isPulling()}
                            >
                                <Show
                                    when={!isPulling()}
                                    fallback={<Loader2 class="w-4 h-4 mr-2 animate-spin" />}
                                >
                                    <Download class="w-4 h-4 mr-2" />
                                </Show>
                                拉取
                            </Button>
                        </div>

                        {/* 拉取进度 */}
                        <Show when={pullProgress() !== null}>
                            <div class="space-y-1">
                                <Progress value={pullProgress()!} class="h-2" />
                                <p class="text-xs text-muted-foreground text-center">
                                    {pullProgress()?.toFixed(1)}%
                                </p>
                            </div>
                        </Show>
                    </div>

                    {/* 模型列表 */}
                    <div class="space-y-2">
                        <div class="flex items-center justify-between">
                            <label class="text-sm font-medium">已安装模型</label>
                            <span class="text-xs text-muted-foreground">
                                {ollama.status().models.length} 个模型
                            </span>
                        </div>

                        <Show
                            when={ollama.status().models.length > 0}
                            fallback={
                                <div class="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                                    <p class="text-sm">暂无已安装的模型</p>
                                    <p class="text-xs mt-1">使用上方输入框拉取模型</p>
                                </div>
                            }
                        >
                            <div class="space-y-2">
                                <For each={ollama.status().models}>
                                    {(model) => <ModelCard model={model} onDelete={handleDeleteModel} />}
                                </For>
                            </div>
                        </Show>
                    </div>
                </Show>
            </CardContent>
        </Card>
    );
};

// ============ 模型卡片组件 ============

interface ModelCardProps {
    model: OllamaModel;
    onDelete: (name: string) => void;
}

const ModelCard: Component<ModelCardProps> = (props) => {
    const { model, tag } = parseModelName(props.model.name);
    const [isDeleting, setIsDeleting] = createSignal(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        await props.onDelete(props.model.name);
        setIsDeleting(false);
    };

    return (
        <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-lg bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {model.charAt(0).toUpperCase()}
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-medium truncate">{model}</span>
                        <Badge variant="outline" class="text-xs">
                            {tag}
                        </Badge>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatModelSize(props.model.size)}</span>
                        <Show when={props.model.details?.parameter_size}>
                            <span>{props.model.details?.parameter_size}</span>
                        </Show>
                        <Show when={props.model.details?.quantization_level}>
                            <span>{props.model.details?.quantization_level}</span>
                        </Show>
                    </div>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon"
                class="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={isDeleting()}
            >
                <Show when={!isDeleting()} fallback={<Loader2 class="w-4 h-4 animate-spin" />}>
                    <Trash2 class="w-4 h-4" />
                </Show>
            </Button>
        </div>
    );
};

export default OllamaManager;
