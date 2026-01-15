/**
 * Model Store - 模型配置状态管理
 * 
 * 负责管理 AI 模型提供商配置、默认模型选择等
 */

import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";

// ============ 类型定义 ============

export type ProviderType =
    | "openai"
    | "anthropic"
    | "google"
    | "ollama"
    | "openai-compatible"
    | "local-gguf";

export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    contextLength?: number;
    inputCost?: number;  // $ per 1M tokens
    outputCost?: number; // $ per 1M tokens
    capabilities?: ("chat" | "vision" | "tools" | "embedding")[];
    isDefault?: boolean;
}

export interface ProviderConfig {
    id: string;
    name: string;
    type: ProviderType;
    baseUrl?: string;
    apiKey?: string;
    enabled: boolean;
    isLocal: boolean;
    models: ModelInfo[];
    customModels?: string[]; // 用户自定义添加的模型 ID
}

export interface ModelStoreState {
    providers: ProviderConfig[];
    defaultProviderId: string;
    defaultModelId: string;
    recentModels: string[]; // 最近使用的模型 ID (格式: providerId:modelId)
}

// ============ 默认配置 ============

const defaultProviders: ProviderConfig[] = [
    {
        id: "openai",
        name: "OpenAI",
        type: "openai",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        enabled: true,
        isLocal: false,
        models: [
            { id: "gpt-4o", name: "GPT-4o", contextLength: 128000, inputCost: 2.5, outputCost: 10, capabilities: ["chat", "vision", "tools"], isDefault: true },
            { id: "gpt-4o-mini", name: "GPT-4o Mini", contextLength: 128000, inputCost: 0.15, outputCost: 0.6, capabilities: ["chat", "vision", "tools"] },
            { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextLength: 128000, inputCost: 10, outputCost: 30, capabilities: ["chat", "vision", "tools"] },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextLength: 16385, inputCost: 0.5, outputCost: 1.5, capabilities: ["chat", "tools"] },
            { id: "o1", name: "o1", contextLength: 128000, inputCost: 15, outputCost: 60, capabilities: ["chat"] },
            { id: "o1-mini", name: "o1 Mini", contextLength: 128000, inputCost: 3, outputCost: 12, capabilities: ["chat"] },
        ],
    },
    {
        id: "anthropic",
        name: "Anthropic",
        type: "anthropic",
        baseUrl: "https://api.anthropic.com",
        apiKey: "",
        enabled: true,
        isLocal: false,
        models: [
            { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", contextLength: 200000, inputCost: 3, outputCost: 15, capabilities: ["chat", "vision", "tools"], isDefault: true },
            { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextLength: 200000, inputCost: 0.8, outputCost: 4, capabilities: ["chat", "vision", "tools"] },
            { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextLength: 200000, inputCost: 15, outputCost: 75, capabilities: ["chat", "vision", "tools"] },
        ],
    },
    {
        id: "google",
        name: "Google",
        type: "google",
        apiKey: "",
        enabled: true,
        isLocal: false,
        models: [
            { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash", contextLength: 1000000, capabilities: ["chat", "vision", "tools"], isDefault: true },
            { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextLength: 2000000, inputCost: 1.25, outputCost: 5, capabilities: ["chat", "vision", "tools"] },
            { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextLength: 1000000, inputCost: 0.075, outputCost: 0.3, capabilities: ["chat", "vision", "tools"] },
        ],
    },
    {
        id: "ollama",
        name: "Ollama (本地)",
        type: "ollama",
        baseUrl: "http://localhost:11434",
        enabled: false,
        isLocal: true,
        models: [
            { id: "llama3.2:latest", name: "Llama 3.2", contextLength: 128000, capabilities: ["chat"] },
            { id: "llama3.2-vision:latest", name: "Llama 3.2 Vision", contextLength: 128000, capabilities: ["chat", "vision"] },
            { id: "qwen2.5:7b", name: "Qwen 2.5 7B", contextLength: 32768, capabilities: ["chat", "tools"] },
            { id: "qwen2.5:14b", name: "Qwen 2.5 14B", contextLength: 32768, capabilities: ["chat", "tools"] },
            { id: "deepseek-r1:7b", name: "DeepSeek R1 7B", contextLength: 65536, capabilities: ["chat"] },
            { id: "mistral:latest", name: "Mistral", contextLength: 32768, capabilities: ["chat"] },
        ],
    },
    {
        id: "deepseek",
        name: "DeepSeek",
        type: "openai-compatible",
        baseUrl: "https://api.deepseek.com/v1",
        apiKey: "",
        enabled: false,
        isLocal: false,
        models: [
            { id: "deepseek-chat", name: "DeepSeek Chat", contextLength: 64000, inputCost: 0.14, outputCost: 0.28, capabilities: ["chat", "tools"] },
            { id: "deepseek-reasoner", name: "DeepSeek R1", contextLength: 64000, inputCost: 0.55, outputCost: 2.19, capabilities: ["chat"] },
        ],
    },
    {
        id: "local-gguf",
        name: "本地 GGUF 模型",
        type: "local-gguf",
        enabled: false,
        isLocal: true,
        models: [],
    },
];

const initialState: ModelStoreState = {
    providers: defaultProviders,
    defaultProviderId: "openai",
    defaultModelId: "gpt-4o",
    recentModels: [],
};

// ============ Store 创建 ============

const [state, setState] = makePersisted(
    createStore<ModelStoreState>(initialState),
    {
        name: "seeker_model_store",
        serialize: (value) => JSON.stringify(value),
        deserialize: (value) => JSON.parse(value),
    }
);

// ============ Actions ============

/**
 * 更新提供商配置
 */
export function updateProvider(
    providerId: string,
    updates: Partial<Pick<ProviderConfig, "enabled" | "apiKey" | "baseUrl" | "customModels">>
): void {
    setState("providers", (p) => p.id === providerId, (provider) => ({
        ...provider,
        ...updates,
    }));
}

/**
 * 添加自定义模型到提供商
 */
export function addCustomModel(providerId: string, modelId: string): void {
    setState("providers", (p) => p.id === providerId, "customModels", (models = []) =>
        models.includes(modelId) ? models : [...models, modelId]
    );
}

/**
 * 移除自定义模型
 */
export function removeCustomModel(providerId: string, modelId: string): void {
    setState("providers", (p) => p.id === providerId, "customModels", (models = []) =>
        models.filter((m) => m !== modelId)
    );
}

/**
 * 设置默认模型
 */
export function setDefaultModel(providerId: string, modelId: string): void {
    setState("defaultProviderId", providerId);
    setState("defaultModelId", modelId);
}

/**
 * 记录最近使用的模型
 */
export function recordRecentModel(providerId: string, modelId: string): void {
    const fullId = `${providerId}:${modelId}`;
    setState("recentModels", (models) => {
        const filtered = models.filter((m) => m !== fullId);
        return [fullId, ...filtered].slice(0, 10); // 保留最近 10 个
    });
}

/**
 * 添加新的提供商
 */
export function addProvider(provider: ProviderConfig): void {
    setState("providers", (providers) => [...providers, provider]);
}

/**
 * 删除提供商
 */
export function removeProvider(providerId: string): void {
    // 不允许删除默认提供商
    const defaultIds = ["openai", "anthropic", "google", "ollama"];
    if (defaultIds.includes(providerId)) return;

    setState("providers", (providers) =>
        providers.filter((p) => p.id !== providerId)
    );
}

/**
 * 添加本地 GGUF 模型
 */
export function addLocalGGUFModel(model: ModelInfo): void {
    setState("providers", (p) => p.id === "local-gguf", "models", (models) =>
        [...models, model]
    );
}

/**
 * 移除本地 GGUF 模型
 */
export function removeLocalGGUFModel(modelId: string): void {
    setState("providers", (p) => p.id === "local-gguf", "models", (models) =>
        models.filter((m) => m.id !== modelId)
    );
}

/**
 * 更新 Ollama 模型列表
 */
export function updateOllamaModels(models: ModelInfo[]): void {
    setState("providers", (p) => p.id === "ollama", "models", models);
}

/**
 * 重置为默认配置
 */
export function resetToDefaults(): void {
    setState(initialState);
}

// ============ Selectors ============

/**
 * 获取启用的提供商
 */
export function getEnabledProviders(): ProviderConfig[] {
    return state.providers.filter((p) => p.enabled);
}

/**
 * 获取提供商
 */
export function getProvider(providerId: string): ProviderConfig | undefined {
    return state.providers.find((p) => p.id === providerId);
}

/**
 * 获取模型的完整信息
 */
export function getModelInfo(providerId: string, modelId: string): ModelInfo | undefined {
    const provider = getProvider(providerId);
    if (!provider) return undefined;
    return provider.models.find((m) => m.id === modelId);
}

/**
 * 获取默认模型的完整 ID
 */
export function getDefaultFullModelId(): string {
    return `${state.defaultProviderId}:${state.defaultModelId}`;
}

/**
 * 解析完整模型 ID
 */
export function parseFullModelId(fullId: string): { providerId: string; modelId: string } | null {
    const parts = fullId.split(":");
    if (parts.length < 2) return null;
    return {
        providerId: parts[0],
        modelId: parts.slice(1).join(":"),
    };
}

/**
 * 获取所有可用模型列表 (扁平化)
 */
export function getAllAvailableModels(): Array<{
    providerId: string;
    providerName: string;
    model: ModelInfo;
    fullId: string;
}> {
    const result: Array<{
        providerId: string;
        providerName: string;
        model: ModelInfo;
        fullId: string;
    }> = [];

    for (const provider of getEnabledProviders()) {
        for (const model of provider.models) {
            result.push({
                providerId: provider.id,
                providerName: provider.name,
                model,
                fullId: `${provider.id}:${model.id}`,
            });
        }
        // 包含自定义模型
        for (const customModelId of provider.customModels || []) {
            result.push({
                providerId: provider.id,
                providerName: provider.name,
                model: { id: customModelId, name: customModelId },
                fullId: `${provider.id}:${customModelId}`,
            });
        }
    }

    return result;
}

/**
 * 获取本地模型列表
 */
export function getLocalModels(): ModelInfo[] {
    const localProviders = state.providers.filter((p) => p.isLocal && p.enabled);
    return localProviders.flatMap((p) => p.models);
}

// ============ 导出 ============

export const modelStore = {
    // State (只读)
    get state() {
        return state;
    },

    // Getters
    getEnabledProviders,
    getProvider,
    getModelInfo,
    getDefaultFullModelId,
    parseFullModelId,
    getAllAvailableModels,
    getLocalModels,

    // Actions
    updateProvider,
    addCustomModel,
    removeCustomModel,
    setDefaultModel,
    recordRecentModel,
    addProvider,
    removeProvider,
    addLocalGGUFModel,
    removeLocalGGUFModel,
    updateOllamaModels,
    resetToDefaults,
};

export default modelStore;
