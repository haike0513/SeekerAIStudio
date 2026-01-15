/**
 * Store 统一导出
 * 
 * 集中管理所有状态 Store 的导出
 */

// Chat Store
export {
    chatStore as default,
    chatStore,
    type ChatMessage,
    type ChatSession,
    type ChatState,
    createSession,
    deleteSession,
    updateSession,
    setActiveSession,
    addMessage,
    updateMessage,
    deleteMessage,
    clearSessionMessages,
    getSessionMessages,
    getSession,
    getSortedSessions,
    getActiveSession,
    getActiveSessionMessages,
    autoGenerateTitle,
    setLoading,
} from "./chat-store";

// Model Store
export {
    modelStore,
    type ProviderType,
    type ModelInfo,
    type ProviderConfig,
    type ModelStoreState,
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
    getEnabledProviders,
    getProvider,
    getModelInfo,
    getDefaultFullModelId,
    parseFullModelId,
    getAllAvailableModels,
    getLocalModels,
} from "./model-store";

// AI Config (Legacy - 保持兼容)
export {
    aiConfig,
    setAiConfig,
    getActiveProvider,
    type AIProviderConfig,
    type AIConfigState,
} from "./ai-config";
