import { createProviderRegistry } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { lmstudio } from "./provider/lmstudio";
import { geminiProvider, geminiOpenAIProvider } from "./provider/gemini";
/**
 * AI Provider Registry
 * 
 * 统一管理所有 AI 提供者和模型，支持通过 providerId:modelId 格式访问模型
 * 
 * 使用示例:
 * - registry.languageModel('lmstudio:qwen/qwen3-vl-8b')
 * - registry.imageModel('openai:dall-e-3')
 * 
 * 添加新的 Provider 示例:
 * ```ts
 * import { createOpenAI } from '@ai-sdk/openai';
 * 
 * export const registry = createProviderRegistry({
 *   lmstudio,
 *   openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
 * });
 * ```
 */
export const registry = createProviderRegistry({
  lmstudio,
  gemini: geminiOpenAIProvider,
  openai: createOpenAI({
    apiKey: (import.meta as any).env?.VITE_OPENAI_API_KEY || "",
  }),
});

