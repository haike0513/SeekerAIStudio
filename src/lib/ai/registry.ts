import { createProviderRegistry } from "ai";
import { lmstudio } from "./provider/lmstudio";

/**
 * AI Provider Registry
 * 
 * 统一管理所有 AI 提供者和模型，支持通过 providerId:modelId 格式访问模型
 * 
 * 使用示例:
 * - registry.languageModel('lmstudio:qwen/qwen3-vl-8b')
 * - registry.languageModel('lmstudio:gpt-4')
 * 
 * 添加新的 Provider 示例:
 * ```ts
 * import { createOpenAI } from '@ai-sdk/openai';
 * import { createAnthropic } from '@ai-sdk/anthropic';
 * 
 * export const registry = createProviderRegistry({
 *   lmstudio,
 *   openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
 *   anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
 * });
 * ```
 */
export const registry = createProviderRegistry({
  lmstudio,
  // 可以在这里添加更多 providers:
  // openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  // anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});

