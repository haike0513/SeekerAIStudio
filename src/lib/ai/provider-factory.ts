/**
 * AI Provider Factory
 * 
 * 根据配置动态创建 AI SDK provider 实例
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getProvider, parseFullModelId, type ProviderConfig } from "@/lib/store";

// 通用 Provider 类型
type ProviderInstance = ReturnType<typeof createOpenAI> |
    ReturnType<typeof createGoogleGenerativeAI> |
    ReturnType<typeof createOpenAICompatible>;

// Provider 实例缓存
const providerCache = new Map<string, ProviderInstance>();

/**
 * 创建 OpenAI Provider
 */
function createOpenAIProvider(config: ProviderConfig): ProviderInstance {
    return createOpenAI({
        apiKey: config.apiKey || "",
        baseURL: config.baseUrl,
    });
}

/**
 * 创建 Anthropic Provider (使用 OpenAI Compatible)
 */
function createAnthropicProvider(config: ProviderConfig): ProviderInstance {
    // 使用 OpenAI compatible 模式
    return createOpenAICompatible({
        name: "anthropic",
        baseURL: config.baseUrl || "https://api.anthropic.com/v1",
        headers: config.apiKey ? { "x-api-key": config.apiKey } : undefined,
    });
}

/**
 * 创建 Google Provider
 */
function createGoogleProvider(config: ProviderConfig): ProviderInstance {
    return createGoogleGenerativeAI({
        apiKey: config.apiKey || "",
    });
}

/**
 * 创建 Ollama Provider (OpenAI Compatible)
 */
function createOllamaProvider(config: ProviderConfig): ProviderInstance {
    return createOpenAICompatible({
        name: "ollama",
        baseURL: `${config.baseUrl || "http://localhost:11434"}/v1`,
    });
}

/**
 * 创建 OpenAI Compatible Provider (DeepSeek, Moonshot 等)
 */
function createOpenAICompatibleProvider(config: ProviderConfig): ProviderInstance {
    return createOpenAICompatible({
        name: config.id,
        baseURL: config.baseUrl || "",
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : undefined,
    });
}

/**
 * 获取或创建 Provider 实例
 */
export function getOrCreateProvider(providerId: string): ProviderInstance | null {
    // 检查缓存
    if (providerCache.has(providerId)) {
        return providerCache.get(providerId)!;
    }

    // 获取配置
    const config = getProvider(providerId);
    if (!config || !config.enabled) {
        console.warn(`Provider "${providerId}" not found or disabled`);
        return null;
    }

    // 创建 Provider
    let provider: ProviderInstance | null = null;

    switch (config.type) {
        case "openai":
            provider = createOpenAIProvider(config);
            break;
        case "anthropic":
            provider = createAnthropicProvider(config);
            break;
        case "google":
            provider = createGoogleProvider(config);
            break;
        case "ollama":
            provider = createOllamaProvider(config);
            break;
        case "openai-compatible":
            provider = createOpenAICompatibleProvider(config);
            break;
        case "local-gguf":
            // 本地 GGUF 模型需要特殊处理，通过 Tauri 命令调用
            console.warn("Local GGUF provider requires Tauri backend");
            return null;
        default:
            console.error(`Unknown provider type: ${config.type}`);
            return null;
    }

    // 缓存
    if (provider) {
        providerCache.set(providerId, provider);
    }

    return provider;
}

// 语言模型类型 - 使用 any 简化类型处理
type LanguageModelInstance = ReturnType<ReturnType<typeof createOpenAI>>;

/**
 * 获取语言模型实例
 * 
 * @param fullModelId - 完整模型 ID (格式: providerId:modelId)
 * @returns 语言模型实例
 */
export function getLanguageModel(fullModelId: string): LanguageModelInstance | null {
    const parsed = parseFullModelId(fullModelId);
    if (!parsed) {
        console.error("Invalid model ID format:", fullModelId);
        return null;
    }

    const provider = getOrCreateProvider(parsed.providerId);
    if (!provider) {
        return null;
    }

    try {
        // 调用 provider 获取模型
        return (provider as any)(parsed.modelId);
    } catch (error) {
        console.error("Failed to create language model:", error);
        return null;
    }
}

/**
 * 清除 Provider 缓存
 * 
 * 当配置发生变化时调用
 */
export function clearProviderCache(providerId?: string): void {
    if (providerId) {
        providerCache.delete(providerId);
    } else {
        providerCache.clear();
    }
}

/**
 * 验证 Provider 配置是否有效
 */
export async function validateProviderConfig(config: ProviderConfig): Promise<{
    valid: boolean;
    error?: string;
}> {
    try {
        // 对于需要 API Key 的提供商，检查是否已配置
        if (["openai", "anthropic", "google", "openai-compatible"].includes(config.type)) {
            if (!config.apiKey) {
                return { valid: false, error: "API Key 未配置" };
            }
        }

        // 对于本地提供商，检查服务是否可用
        if (config.type === "ollama") {
            try {
                const response = await fetch(`${config.baseUrl || "http://localhost:11434"}/api/tags`, {
                    method: "GET",
                    signal: AbortSignal.timeout(5000),
                });
                if (!response.ok) {
                    return { valid: false, error: "无法连接到 Ollama 服务" };
                }
            } catch {
                return { valid: false, error: "Ollama 服务未运行" };
            }
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: String(error) };
    }
}

/**
 * 获取 Ollama 可用模型列表
 */
export async function fetchOllamaModels(baseUrl?: string): Promise<string[]> {
    try {
        const url = `${baseUrl || "http://localhost:11434"}/api/tags`;
        const response = await fetch(url, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.models?.map((m: { name: string }) => m.name) || [];
    } catch (error) {
        console.error("Failed to fetch Ollama models:", error);
        return [];
    }
}

/**
 * 检测本地服务状态
 */
export async function checkLocalServices(): Promise<{
    ollama: { available: boolean; models: string[] };
}> {
    const ollamaModels = await fetchOllamaModels();

    return {
        ollama: {
            available: ollamaModels.length > 0,
            models: ollamaModels,
        },
    };
}

// 导出类型
export type { LanguageModelInstance };
