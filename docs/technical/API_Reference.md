# SeekerAIStudio API 参考文档

> 版本: 1.0
> 最后更新: 2026-01-16
> 状态: Draft

---

## 目录
1. [概述](#1-概述)
2. [前端 API](#2-前端-api)
3. [Tauri 命令 API](#3-tauri-命令-api)
4. [AI SDK API](#4-ai-sdk-api)
5. [工具定义 API](#5-工具定义-api)
6. [事件系统](#6-事件系统)
7. [存储 API](#7-存储-api)
8. [错误处理](#8-错误处理)

---

## 1. 概述

### 1.1 API 架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (SolidJS)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Components    │  │     Stores      │  │     Hooks       │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
│                    ┌───────────▼───────────┐                    │
│                    │       lib/tauri       │                    │
│                    │   (封装的 Tauri API)   │                    │
│                    └───────────┬───────────┘                    │
└────────────────────────────────┼────────────────────────────────┘
                                 │ invoke() / emit() / listen()
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Tauri Backend (Rust)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │    Commands     │  │     Events      │  │     State       │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 类型约定

本文档使用 TypeScript 类型定义，Rust 类型会有对应标注。

```typescript
// 通用响应类型
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// 分页类型
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## 2. 前端 API

### 2.1 状态管理 Hooks

#### useChatStore

管理聊天会话状态。

```typescript
import { useChatStore } from '@/lib/stores/chat';

// 使用
const chatStore = useChatStore();

// API
interface ChatStore {
  // 状态
  sessions: () => ChatSession[];
  activeSessionId: () => string | null;
  messages: (sessionId: string) => Message[];
  
  // 操作
  createSession: (title?: string) => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: (sessionId: string) => Promise<void>;
}

// 类型
interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
}

interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  tokens?: number;
}
```

#### useModelStore

管理 AI 模型配置。

```typescript
import { useModelStore } from '@/lib/stores/models';

interface ModelStore {
  // 状态
  models: () => ModelConfig[];
  activeModelId: () => string | null;
  
  // 操作
  loadModels: () => Promise<void>;
  addModel: (config: ModelConfig) => Promise<void>;
  removeModel: (id: string) => Promise<void>;
  setActiveModel: (id: string) => void;
}

interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local';
  baseURL?: string;
  apiKey?: string;
  modelId: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  isLocal: boolean;
}
```

#### useSettingsStore

管理应用设置。

```typescript
import { useSettingsStore } from '@/lib/stores/settings';

interface SettingsStore {
  // 状态
  theme: () => 'light' | 'dark' | 'system';
  language: () => 'zh-CN' | 'en-US';
  fontSize: () => number;
  
  // 操作
  setTheme: (theme: Theme) => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  setFontSize: (size: number) => Promise<void>;
  reset: () => Promise<void>;
}
```

### 2.2 AI SDK Hooks

#### useChat

用于对话式交互。

```typescript
import { useChat } from '@/lib/ai/hooks';

const { 
  messages, 
  input, 
  setInput,
  isLoading,
  error,
  submit,
  stop,
  reload,
} = useChat({
  model: 'openai:gpt-4o',
  systemPrompt: '你是一个有帮助的助手',
  onFinish: (message) => {
    console.log('完成:', message);
  },
  onError: (error) => {
    console.error('错误:', error);
  },
});

// 发送消息
submit('你好');

// 停止生成
stop();

// 重新生成最后一条回复
reload();
```

#### useCompletion

用于文本补全。

```typescript
import { useCompletion } from '@/lib/ai/hooks';

const {
  completion,
  input,
  setInput,
  isLoading,
  complete,
  stop,
} = useCompletion({
  model: 'openai:gpt-4o',
  prompt: '续写以下故事：',
});

// 获取补全
const result = await complete('从前有座山...');
```

#### useStreamingText

用于流式文本显示。

```typescript
import { useStreamingText } from '@/lib/ai/hooks';

const {
  text,
  isStreaming,
  start,
  pause,
  reset,
} = useStreamingText({
  speed: 50, // 每个字符间隔 (ms)
});

// 开始流式显示
start('这是一段很长的文本...');
```

---

## 3. Tauri 命令 API

### 3.1 文件操作

#### read_file

读取文件内容。

```typescript
// 前端调用
import { invoke } from '@tauri-apps/api/core';

const content = await invoke<string>('read_file', {
  path: '/path/to/file.txt',
});
```

```rust
// Rust 实现
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("读取文件失败: {}", e))
}
```

#### write_file

写入文件内容。

```typescript
await invoke('write_file', {
  path: '/path/to/file.txt',
  content: '文件内容',
});
```

```rust
#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content)
        .map_err(|e| format!("写入文件失败: {}", e))
}
```

#### list_directory

列出目录内容。

```typescript
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
}

const entries = await invoke<FileEntry[]>('list_directory', {
  path: '/path/to/dir',
});
```

#### create_directory

创建目录。

```typescript
await invoke('create_directory', {
  path: '/path/to/new/dir',
});
```

#### delete_file

删除文件或目录。

```typescript
await invoke('delete_file', {
  path: '/path/to/file',
  recursive: true, // 如果是目录，递归删除
});
```

### 3.2 数据库操作

#### db_execute

执行 SQL 语句。

```typescript
await invoke('db_execute', {
  sql: 'INSERT INTO sessions (id, title) VALUES (?, ?)',
  params: ['session_1', '新对话'],
});
```

#### db_query

查询数据。

```typescript
interface Row {
  id: string;
  title: string;
  created_at: number;
}

const rows = await invoke<Row[]>('db_query', {
  sql: 'SELECT * FROM sessions WHERE id = ?',
  params: ['session_1'],
});
```

### 3.3 模型推理

#### load_model

加载本地模型。

```typescript
interface LoadModelOptions {
  path: string;
  quantization?: 'q4_0' | 'q4_1' | 'q5_0' | 'q5_1' | 'q8_0' | 'f16' | 'f32';
  gpuLayers?: number;
  contextSize?: number;
}

interface LoadedModel {
  id: string;
  name: string;
  size: number;
  parameters: number;
  quantization: string;
}

const model = await invoke<LoadedModel>('load_model', {
  options: {
    path: '/path/to/model.gguf',
    quantization: 'q4_0',
    gpuLayers: 35,
    contextSize: 4096,
  },
});
```

#### unload_model

卸载模型释放内存。

```typescript
await invoke('unload_model', {
  modelId: 'model_1',
});
```

#### generate_text

生成文本（非流式）。

```typescript
interface GenerateOptions {
  modelId: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

interface GenerateResult {
  text: string;
  tokens: number;
  finishReason: 'stop' | 'length' | 'error';
}

const result = await invoke<GenerateResult>('generate_text', {
  options: {
    modelId: 'model_1',
    prompt: '你好，',
    maxTokens: 100,
    temperature: 0.7,
  },
});
```

#### stream_generate

流式生成文本。

```typescript
import { listen } from '@tauri-apps/api/event';

// 监听流式输出
const unlisten = await listen<string>('stream-token', (event) => {
  console.log('Token:', event.payload);
});

// 开始生成
await invoke('stream_generate', {
  options: {
    modelId: 'model_1',
    prompt: '讲一个故事',
  },
});

// 完成后取消监听
unlisten();
```

### 3.4 设置管理

#### get_setting

获取设置值。

```typescript
const theme = await invoke<string>('get_setting', {
  key: 'theme',
  defaultValue: 'dark',
});
```

#### set_setting

保存设置值。

```typescript
await invoke('set_setting', {
  key: 'theme',
  value: 'light',
});
```

#### get_all_settings

获取所有设置。

```typescript
interface Settings {
  theme: string;
  language: string;
  fontSize: number;
  // ...
}

const settings = await invoke<Settings>('get_all_settings');
```

### 3.5 系统信息

#### get_system_info

获取系统信息。

```typescript
interface SystemInfo {
  os: string;
  arch: string;
  totalMemory: number;
  availableMemory: number;
  gpus: GpuInfo[];
}

interface GpuInfo {
  name: string;
  vendor: string;
  vram: number;
  driverVersion: string;
}

const info = await invoke<SystemInfo>('get_system_info');
```

#### get_app_paths

获取应用路径。

```typescript
interface AppPaths {
  config: string;
  data: string;
  cache: string;
  logs: string;
  models: string;
}

const paths = await invoke<AppPaths>('get_app_paths');
```

---

## 4. AI SDK API

### 4.1 模型提供商

#### 创建 OpenAI Provider

```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1', // 可自定义
});

// 使用模型
const model = openai('gpt-4o');
```

#### 创建 Anthropic Provider

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic('claude-3-5-sonnet-20241022');
```

#### 创建 Ollama Provider

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

const model = ollama('llama3.2:latest');
```

### 4.2 文本生成

#### generateText

一次性生成完整文本。

```typescript
import { generateText } from 'ai';

const { text, usage, finishReason } = await generateText({
  model: openai('gpt-4o'),
  prompt: '讲一个笑话',
  maxTokens: 500,
  temperature: 0.7,
});

console.log(text);
console.log(`Token 使用: ${usage.totalTokens}`);
```

#### streamText

流式生成文本。

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'system', content: '你是一个有帮助的助手' },
    { role: 'user', content: '讲一个故事' },
  ],
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// 获取完整结果
const fullText = await result.text;
const usage = await result.usage;
```

### 4.3 结构化输出

#### generateObject

生成结构化对象。

```typescript
import { generateObject } from 'ai';
import { z } from 'zod';

const characterSchema = z.object({
  name: z.string().describe('角色名称'),
  age: z.number().describe('年龄'),
  personality: z.array(z.string()).describe('性格特点'),
  backstory: z.string().describe('背景故事'),
});

const { object } = await generateObject({
  model: openai('gpt-4o'),
  schema: characterSchema,
  prompt: '创建一个奇幻小说中的角色',
});

console.log(object.name);      // "艾莉娅"
console.log(object.age);       // 25
console.log(object.personality); // ["勇敢", "善良", "固执"]
```

#### streamObject

流式生成结构化对象。

```typescript
import { streamObject } from 'ai';

const result = await streamObject({
  model: openai('gpt-4o'),
  schema: characterSchema,
  prompt: '创建一个角色',
});

for await (const partialObject of result.partialObjectStream) {
  console.log('部分结果:', partialObject);
}

const finalObject = await result.object;
```

### 4.4 工具调用

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const weatherTool = tool({
  description: '获取指定城市的天气',
  parameters: z.object({
    city: z.string().describe('城市名称'),
  }),
  execute: async ({ city }) => {
    // 实际实现
    return { temperature: 25, condition: 'sunny' };
  },
});

const { text, toolCalls, toolResults } = await generateText({
  model: openai('gpt-4o'),
  prompt: '北京今天天气怎么样？',
  tools: { weather: weatherTool },
});

console.log(text);
// "北京今天天气晴朗，温度 25 度。"
```

---

## 5. 工具定义 API

### 5.1 内置工具

#### 文件系统工具

```typescript
import { fileSystemTools } from '@/lib/ai/tools';

// 可用工具
const tools = {
  readFile: fileSystemTools.readFile,
  writeFile: fileSystemTools.writeFile,
  listDirectory: fileSystemTools.listDirectory,
  searchFiles: fileSystemTools.searchFiles,
};
```

#### 网络工具

```typescript
import { networkTools } from '@/lib/ai/tools';

const tools = {
  httpRequest: networkTools.httpRequest,
  fetchWebPage: networkTools.fetchWebPage,
  searchWeb: networkTools.searchWeb,
};
```

#### 图像生成工具

```typescript
import { imageTools } from '@/lib/ai/tools';

const tools = {
  generateImage: imageTools.generate,
  editImage: imageTools.edit,
  upscaleImage: imageTools.upscale,
};
```

### 5.2 自定义工具

```typescript
import { tool } from 'ai';
import { z } from 'zod';

// 定义自定义工具
const myCustomTool = tool({
  description: '工具描述',
  parameters: z.object({
    param1: z.string().describe('参数1说明'),
    param2: z.number().optional().describe('参数2说明'),
  }),
  execute: async ({ param1, param2 }) => {
    // 工具实现
    return { result: 'success' };
  },
});

// 注册到工具集
registerTool('myCustomTool', myCustomTool);
```

---

## 6. 事件系统

### 6.1 前端事件

#### 监听事件

```typescript
import { listen } from '@tauri-apps/api/event';

// 监听模型加载进度
const unlisten = await listen<number>('model-loading-progress', (event) => {
  console.log(`加载进度: ${event.payload}%`);
});

// 取消监听
unlisten();
```

#### 发送事件

```typescript
import { emit } from '@tauri-apps/api/event';

// 发送事件到后端
await emit('user-action', { action: 'click', target: 'button' });
```

### 6.2 后端事件

```rust
use tauri::Manager;

#[tauri::command]
pub async fn start_long_task(app: tauri::AppHandle) {
    // 发送进度事件
    for i in 0..=100 {
        app.emit("task-progress", i).unwrap();
        std::thread::sleep(std::time::Duration::from_millis(50));
    }
    
    // 发送完成事件
    app.emit("task-complete", ()).unwrap();
}
```

### 6.3 常用事件列表

| 事件名 | 载荷类型 | 说明 |
|--------|---------|------|
| `model-loading-progress` | `number` | 模型加载进度 (0-100) |
| `model-loaded` | `LoadedModel` | 模型加载完成 |
| `stream-token` | `string` | 流式生成的 Token |
| `stream-complete` | `StreamResult` | 流式生成完成 |
| `task-progress` | `TaskProgress` | 任务进度 |
| `error` | `ErrorEvent` | 错误事件 |

---

## 7. 存储 API

### 7.1 本地存储

#### LocalStorage

用于小量数据存储。

```typescript
import { storage } from '@/lib/storage';

// 存储
await storage.local.set('key', { data: 'value' });

// 读取
const value = await storage.local.get<{ data: string }>('key');

// 删除
await storage.local.remove('key');

// 清空
await storage.local.clear();
```

#### FileStorage

用于大量数据存储。

```typescript
import { storage } from '@/lib/storage';

// 保存项目
await storage.file.saveProject('project_1', projectData);

// 加载项目
const project = await storage.file.loadProject('project_1');

// 列出所有项目
const projects = await storage.file.listProjects();
```

### 7.2 数据库存储

#### 会话存储

```typescript
import { db } from '@/lib/storage';

// 创建会话
const session = await db.sessions.create({
  title: '新对话',
  modelId: 'gpt-4o',
});

// 查询会话
const sessions = await db.sessions.list({
  orderBy: 'updatedAt',
  order: 'desc',
  limit: 20,
});

// 更新会话
await db.sessions.update(session.id, {
  title: '更新后的标题',
});

// 删除会话
await db.sessions.delete(session.id);
```

#### 消息存储

```typescript
import { db } from '@/lib/storage';

// 添加消息
await db.messages.add(sessionId, {
  role: 'user',
  content: '你好',
});

// 获取消息列表
const messages = await db.messages.list(sessionId, {
  limit: 100,
  offset: 0,
});

// 删除会话的所有消息
await db.messages.clearSession(sessionId);
```

---

## 8. 错误处理

### 8.1 错误类型

```typescript
// 基础错误类
class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 特定错误类型
class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NETWORK_ERROR', message, details);
  }
}

class ModelError extends AppError {
  constructor(message: string, details?: unknown) {
    super('MODEL_ERROR', message, details);
  }
}

class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
  }
}
```

### 8.2 错误代码

| 代码 | 说明 | 处理建议 |
|------|------|---------|
| `NETWORK_ERROR` | 网络请求失败 | 检查网络连接，重试 |
| `MODEL_ERROR` | 模型推理错误 | 检查模型配置 |
| `MODEL_NOT_LOADED` | 模型未加载 | 先加载模型 |
| `VALIDATION_ERROR` | 参数验证失败 | 检查输入参数 |
| `FILE_NOT_FOUND` | 文件不存在 | 检查文件路径 |
| `PERMISSION_DENIED` | 权限不足 | 检查文件权限 |
| `RATE_LIMIT` | API 速率限制 | 稍后重试 |
| `QUOTA_EXCEEDED` | 配额用尽 | 升级套餐 |
| `UNKNOWN_ERROR` | 未知错误 | 查看详细日志 |

### 8.3 错误处理最佳实践

```typescript
import { toast } from '@/components/ui/toast';
import { logger } from '@/lib/logger';

async function handleApiCall<T>(
  fn: () => Promise<T>,
  options?: {
    showToast?: boolean;
    retries?: number;
    retryDelay?: number;
  }
): Promise<T | null> {
  const { showToast = true, retries = 0, retryDelay = 1000 } = options ?? {};
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      logger.error('API 调用失败', { error, attempt });
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      if (showToast) {
        const message = error instanceof AppError 
          ? error.message 
          : '操作失败，请稍后重试';
        toast.error(message);
      }
      
      return null;
    }
  }
  
  return null;
}

// 使用
const result = await handleApiCall(
  () => invoke('some_command', { param: 'value' }),
  { retries: 2 }
);
```

---

## 附录

### A. TypeScript 类型定义文件

完整的类型定义位于 `src/lib/types/` 目录。

### B. Rust API 文档

Rust 后端 API 文档可通过 `cargo doc --open` 生成。

### C. 变更记录

| 日期 | 版本 | 变更内容 |
|------|------|---------|
| 2026-01-16 | 1.0 | 初始版本 |
