/**
 * Ollama 服务管理 Hook
 * 
 * 用于检测 Ollama 服务状态和管理本地模型
 */

import { createSignal, createEffect, onCleanup } from "solid-js";
import { updateOllamaModels, type ModelInfo } from "@/lib/store";

// ============ 类型定义 ============

export interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
    details?: {
        format: string;
        family: string;
        families?: string[];
        parameter_size: string;
        quantization_level: string;
    };
}

export interface OllamaServiceStatus {
    available: boolean;
    version?: string;
    models: OllamaModel[];
}

export interface UseOllamaOptions {
    baseUrl?: string;
    pollInterval?: number; // 轮询间隔 (ms)，0 表示不轮询
}

// ============ Hook 实现 ============

export function useOllama(options: UseOllamaOptions = {}) {
    const baseUrl = options.baseUrl || "http://localhost:11434";
    const pollInterval = options.pollInterval ?? 0;

    const [status, setStatus] = createSignal<OllamaServiceStatus>({
        available: false,
        models: [],
    });
    const [isLoading, setIsLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    let pollTimer: number | undefined;

    /**
     * 检查 Ollama 服务状态
     */
    async function checkStatus(): Promise<OllamaServiceStatus> {
        setIsLoading(true);
        setError(null);

        try {
            // 检查服务是否运行
            const versionResponse = await fetch(`${baseUrl}/api/version`, {
                method: "GET",
                signal: AbortSignal.timeout(3000),
            });

            if (!versionResponse.ok) {
                throw new Error("Ollama 服务响应错误");
            }

            const versionData = await versionResponse.json();

            // 获取模型列表
            const modelsResponse = await fetch(`${baseUrl}/api/tags`, {
                method: "GET",
                signal: AbortSignal.timeout(5000),
            });

            const modelsData = await modelsResponse.json();
            const models: OllamaModel[] = modelsData.models || [];

            const newStatus: OllamaServiceStatus = {
                available: true,
                version: versionData.version,
                models,
            };

            setStatus(newStatus);

            // 更新 Store 中的 Ollama 模型列表
            const storeModels: ModelInfo[] = models.map((m) => ({
                id: m.name,
                name: m.name.split(":")[0],
                description: m.details?.parameter_size,
                contextLength: 8192, // Ollama 默认
                capabilities: ["chat"] as const,
            }));
            updateOllamaModels(storeModels);

            return newStatus;
        } catch (err) {
            const message = err instanceof Error ? err.message : "连接失败";
            setError(message);

            const offlineStatus: OllamaServiceStatus = {
                available: false,
                models: [],
            };
            setStatus(offlineStatus);

            return offlineStatus;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * 拉取模型
     */
    async function pullModel(modelName: string, onProgress?: (progress: number) => void): Promise<void> {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${baseUrl}/api/pull`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: modelName, stream: true }),
            });

            if (!response.ok) {
                throw new Error(`拉取模型失败: ${response.statusText}`);
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            if (!reader) throw new Error("无法读取响应");

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split("\n").filter((l) => l.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.completed && data.total) {
                            const progress = (data.completed / data.total) * 100;
                            onProgress?.(progress);
                        }
                    } catch {
                        // 忽略解析错误
                    }
                }
            }

            // 刷新模型列表
            await checkStatus();
        } catch (err) {
            const message = err instanceof Error ? err.message : "拉取失败";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * 删除模型
     */
    async function deleteModel(modelName: string): Promise<void> {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`${baseUrl}/api/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: modelName }),
            });

            if (!response.ok) {
                throw new Error(`删除模型失败: ${response.statusText}`);
            }

            // 刷新模型列表
            await checkStatus();
        } catch (err) {
            const message = err instanceof Error ? err.message : "删除失败";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }

    /**
     * 启动轮询
     */
    function startPolling() {
        if (pollInterval > 0 && !pollTimer) {
            pollTimer = setInterval(() => {
                checkStatus();
            }, pollInterval) as unknown as number;
        }
    }

    /**
     * 停止轮询
     */
    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = undefined;
        }
    }

    // 初始检查
    createEffect(() => {
        checkStatus();
    });

    // 自动轮询
    createEffect(() => {
        if (pollInterval > 0) {
            startPolling();
        }
    });

    // 清理
    onCleanup(() => {
        stopPolling();
    });

    return {
        status,
        isLoading,
        error,
        checkStatus,
        pullModel,
        deleteModel,
        startPolling,
        stopPolling,
    };
}

/**
 * 格式化模型大小
 */
export function formatModelSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
}

/**
 * 解析模型名称
 */
export function parseModelName(name: string): { model: string; tag: string } {
    const parts = name.split(":");
    return {
        model: parts[0],
        tag: parts[1] || "latest",
    };
}

export default useOllama;
