/**
 * AI 模块统一导出
 * 
 * 集中导出所有 AI 相关的功能
 */

// Provider Registry
export { registry } from "./registry";

// Provider Factory
export {
    getOrCreateProvider,
    getLanguageModel,
    clearProviderCache,
    validateProviderConfig,
    fetchOllamaModels,
    checkLocalServices,
    type LanguageModelInstance,
} from "./provider-factory";

// Hooks
export {
    useChatSession,
    type ChatStatus,
    type UseChatSessionOptions,
    type UseChatSessionReturn,
} from "./use-chat-session";

// Roles (System Prompts)
export {
    AI_ROLES,
    getRoleById,
    getDefaultRole,
    type AIRole,
} from "./roles";

// Utils
export {
    normalizeModelId,
    parseModelId,
} from "./utils";
