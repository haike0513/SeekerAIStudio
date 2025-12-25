/**
 * AI Registry 工具函数
 */

/**
 * 规范化模型 ID，确保使用 providerId:modelId 格式
 * 
 * @param modelId - 模型 ID，可以是完整格式 (providerId:modelId) 或简化格式 (modelId)
 * @param defaultProvider - 默认 provider ID，当 modelId 不包含 ':' 时使用
 * @returns 规范化后的完整模型 ID (providerId:modelId)
 * 
 * @example
 * ```ts
 * normalizeModelId('qwen/qwen3-vl-8b', 'lmstudio') // => 'lmstudio:qwen/qwen3-vl-8b'
 * normalizeModelId('lmstudio:qwen/qwen3-vl-8b', 'lmstudio') // => 'lmstudio:qwen/qwen3-vl-8b'
 * ```
 */
export function normalizeModelId(
  modelId: string,
  defaultProvider: string = "lmstudio"
): string {
  if (modelId.includes(":")) {
    return modelId;
  }
  return `${defaultProvider}:${modelId}`;
}

/**
 * 解析模型 ID，提取 provider 和 model 部分
 * 
 * @param modelId - 完整格式的模型 ID (providerId:modelId)
 * @returns 包含 provider 和 model 的对象
 * 
 * @example
 * ```ts
 * parseModelId('lmstudio:qwen/qwen3-vl-8b') // => { provider: 'lmstudio', model: 'qwen/qwen3-vl-8b' }
 * ```
 */
export function parseModelId(modelId: string): {
  provider: string;
  model: string;
} {
  const parts = modelId.split(":");
  if (parts.length === 1) {
    return { provider: "lmstudio", model: parts[0] };
  }
  const [provider, ...modelParts] = parts;
  return {
    provider: provider!,
    model: modelParts.join(":"),
  };
}

