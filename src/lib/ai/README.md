# AI Provider Registry

这个目录包含 AI SDK 的 Provider Registry 实现，用于统一管理多个 AI 提供者和模型。

## 文件结构

- `registry.ts` - Provider Registry 主文件
- `provider/lmstudio.ts` - LMStudio Provider 配置
- `transport/lmstudio-transport.ts` - LMStudio 聊天传输层
- `utils.ts` - 工具函数（模型 ID 规范化等）

## 使用方式

### 1. 访问模型

Registry 支持通过 `providerId:modelId` 格式访问模型：

```typescript
import { registry } from '@/lib/ai/registry';

// 获取语言模型
const model = registry.languageModel('lmstudio:qwen/qwen3-vl-8b');

// 在 streamText 中使用
import { streamText } from 'ai';
const result = await streamText({
  model: registry.languageModel('lmstudio:qwen/qwen3-vl-8b'),
  prompt: 'Hello, world!',
});
```

### 2. 添加新的 Provider

在 `registry.ts` 中添加新的 provider：

```typescript
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

export const registry = createProviderRegistry({
  lmstudio,
  openai: createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  anthropic: createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY }),
});
```

添加后，就可以使用新的 provider：

```typescript
const model = registry.languageModel('openai:gpt-4');
const model2 = registry.languageModel('anthropic:claude-3-opus');
```

### 3. 工具函数

#### normalizeModelId

规范化模型 ID，确保使用 `providerId:modelId` 格式：

```typescript
import { normalizeModelId } from '@/lib/ai/utils';

normalizeModelId('qwen/qwen3-vl-8b', 'lmstudio') 
// => 'lmstudio:qwen/qwen3-vl-8b'

normalizeModelId('lmstudio:qwen/qwen3-vl-8b', 'lmstudio') 
// => 'lmstudio:qwen/qwen3-vl-8b'
```

#### parseModelId

解析模型 ID，提取 provider 和 model 部分：

```typescript
import { parseModelId } from '@/lib/ai/utils';

parseModelId('lmstudio:qwen/qwen3-vl-8b')
// => { provider: 'lmstudio', model: 'qwen/qwen3-vl-8b' }
```

### 4. 在 ChatTransport 中使用

`LMStudioChatTransport` 已经更新为使用 registry。支持两种格式：

```typescript
// 完整格式
const transport = new LMStudioChatTransport('lmstudio:qwen/qwen3-vl-8b');

// 简化格式（默认使用 lmstudio provider）
const transport = new LMStudioChatTransport('qwen/qwen3-vl-8b');
```

### 5. 在组件中使用

在 `ChatSessionPage` 中，模型列表已经更新为使用 `providerId:modelId` 格式：

```typescript
const MODELS = [
  { id: "lmstudio:qwen/qwen3-vl-8b", name: "Qwen3-VL 8B", ... },
  { id: "openai:gpt-4", name: "GPT-4", ... },
  // ...
];
```

## 参考文档

- [AI SDK Provider Registry 文档](https://ai-sdk.dev/docs/reference/ai-sdk-core/provider-registry)
- [AI SDK 文档](https://ai-sdk.dev/)

