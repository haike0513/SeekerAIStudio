# SeekerAIStudio 技术架构文档

> 版本: 2.0
> 最后更新: 2026-01-16
> 状态: Active Development

---

## 目录
1. [系统概述](#1-系统概述)
2. [技术栈详解](#2-技术栈详解)
3. [系统架构](#3-系统架构)
4. [模块设计](#4-模块设计)
5. [数据流与状态管理](#5-数据流与状态管理)
6. [AI 集成层](#6-ai-集成层)
7. [安全架构](#7-安全架构)
8. [性能优化](#8-性能优化)
9. [部署架构](#9-部署架构)
10. [开发规范](#10-开发规范)

---

## 1. 系统概述

### 1.1 架构理念
SeekerAIStudio 采用现代化的 **混合架构** 设计，结合了：
- **桌面应用的高性能**：通过 Tauri 实现原生级别的系统交互
- **Web 技术的灵活性**：使用 SolidJS 构建响应式 UI
- **本地优先的隐私性**：敏感数据默认在本地处理
- **云端 API 的强大能力**：按需调用高性能云端模型

### 1.2 架构目标
| 目标 | 描述 | 优先级 |
|------|------|--------|
| **性能** | 启动时间 < 5s，UI 响应 < 100ms | P0 |
| **隐私** | 敏感数据零上传，本地模型优先 | P0 |
| **扩展性** | 插件化架构，易于添加新模型和功能 | P1 |
| **可维护性** | 模块化设计，清晰的边界和依赖 | P1 |
| **跨平台** | Windows、macOS、Linux 全平台支持 | P0 |

### 1.3 技术约束
| 约束 | 原因 | 解决方案 |
|------|------|---------|
| Tauri WebView 限制 | 不同平台 WebView 实现不同 | 使用 polyfill，测试多平台 |
| 本地模型显存限制 | 普通用户 GPU 显存有限 | 支持 CPU 推理，量化模型 |
| 离线场景支持 | 部分用户网络环境受限 | 核心功能离线可用 |

---

## 2. 技术栈详解

### 2.1 核心技术栈
```
┌─────────────────────────────────────────────────────────────────────┐
│                         SeekerAIStudio 技术栈                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Frontend Layer                           │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │   │
│  │  │ SolidJS │ │  Tauri  │ │ TailwindCSS │ │ Kobalte │         │   │
│  │  │   1.9   │ │   v2    │ │     v4      │ │  (UI)   │         │   │
│  │  └─────────┘ └─────────┘ └─────────────┘ └─────────┘         │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                       AI Layer                              │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │
│  │  │  ai-sdk     │ │  Ollama     │ │   GGUF      │            │   │
│  │  │  (Vercel)   │ │  (Local)    │ │  (Native)   │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Backend Layer                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │   │
│  │  │    Rust     │ │   SQLite    │ │  FileSystem │            │   │
│  │  │   (Tauri)   │ │    (DB)     │ │  (Storage)  │            │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 前端技术详解

#### 2.2.1 SolidJS (v1.9)
**选型理由:**
- **细粒度响应式**: 无 Virtual DOM，直接更新 DOM，性能优于 React
- **编译时优化**: 构建时生成高效代码，运行时开销极小
- **熟悉的 API**: 与 React Hooks 相似，学习曲线平缓
- **Bundle 体积小**: 核心库仅 ~7KB gzipped

**核心 API 使用:**
```typescript
// 响应式状态
const [count, setCount] = createSignal(0);

// 计算属性 (自动依赖追踪)
const doubled = createMemo(() => count() * 2);

// 副作用 (自动清理)
createEffect(() => {
  console.log("Count:", count());
  onCleanup(() => console.log("Cleaning up..."));
});
```

#### 2.2.2 Tauri v2
**选型理由:**
- **体积小**: 相比 Electron，安装包小 10-100 倍
- **性能高**: 原生 Rust 后端，内存占用低
- **安全**: 默认最小权限，细粒度 API 控制
- **跨平台**: 支持 Windows、macOS、Linux、iOS、Android

**核心能力:**
```rust
// Tauri Command 示例
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| e.to_string())
}

// 前端调用
const content = await invoke('read_file', { path: '/path/to/file.txt' });
```

#### 2.2.3 TailwindCSS v4
**选型理由:**
- **原子化 CSS**: 高度可组合，减少样式冲突
- **JIT 编译**: 按需生成，零冗余
- **设计约束**: 内置设计系统，保证一致性

#### 2.2.4 Kobalte UI
**选型理由:**
- **SolidJS 原生**: 专为 SolidJS 设计，无适配问题
- **无样式组件**: 仅提供行为和 a11y，样式自由定制
- **类 Radix UI**: API 设计参考 Radix，学习资源丰富

### 2.3 AI 层技术详解

#### 2.3.1 Vercel AI SDK
**选型理由:**
- **统一接口**: 一套代码对接所有主流 LLM
- **流式支持**: 原生支持 SSE 流式响应
- **类型安全**: 完整的 TypeScript 类型定义
- **生态丰富**: 官方维护多种 Provider

**支持的 Provider:**
| Provider | 模型 | 类型 |
|----------|------|------|
| `@ai-sdk/openai` | GPT-4o, GPT-4, GPT-3.5 | 云端 |
| `@ai-sdk/anthropic` | Claude 3.5, Claude 3 | 云端 |
| `@ai-sdk/google` | Gemini Pro, Gemini Flash | 云端 |
| `@ai-sdk/openai-compatible` | Ollama, LocalAI, vLLM | 本地/自托管 |

**核心 API:**
```typescript
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

// 一次性生成
const { text } = await generateText({
  model: openai('gpt-4o'),
  prompt: '讲一个笑话',
});

// 流式生成
const result = await streamText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: '讲一个笑话' }],
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

#### 2.3.2 本地模型支持

**Ollama 集成:**
```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: 'http://localhost:11434/v1',
});

const { text } = await generateText({
  model: ollama('llama3.2:latest'),
  prompt: '你好',
});
```

**GGUF 原生推理 (Rust):**
```rust
// src-tauri/ai_base/src/gguf_inference.rs
use llama_cpp::LlamaModel;

pub async fn generate(
    model_path: &str,
    prompt: &str,
    max_tokens: usize,
) -> Result<String, Error> {
    let model = LlamaModel::load_from_file(model_path)?;
    let session = model.create_session();
    session.generate(prompt, max_tokens)
}
```

### 2.4 后端技术详解

#### 2.4.1 Rust (Tauri Backend)
**目录结构:**
```
src-tauri/
├── src/
│   ├── main.rs              # 入口
│   ├── lib.rs               # 命令注册
│   ├── inference.rs         # AI 推理逻辑
│   └── commands/            # Tauri 命令
│       ├── mod.rs
│       ├── file.rs          # 文件操作
│       ├── gguf.rs          # GGUF 模型
│       ├── qwen3vl.rs       # Qwen 视觉模型
│       └── settings.rs      # 设置管理
├── ai_base/                 # AI 基础库
│   └── src/
│       ├── lib.rs
│       ├── models/          # 模型实现
│       │   ├── gguf/
│       │   └── qwen3vl/
│       └── utils/
└── Cargo.toml
```

#### 2.4.2 SQLite (数据存储)
**数据库 Schema:**
```sql
-- 项目表
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,  -- 'novel', 'comic', 'audio', 'video'
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT  -- JSON
);

-- 聊天会话
CREATE TABLE chat_sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    model_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 聊天消息
CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id),
    role TEXT NOT NULL,  -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 设置
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## 3. 系统架构

### 3.1 整体架构图
```
┌────────────────────────────────────────────────────────────────────────┐
│                              用户界面层                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                          SolidJS App                             │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  │  │  Chat  │ │ Novel  │ │ Comic  │ │ Audio  │ │ Video  │         │  │
│  │  │ Module │ │ Module │ │ Module │ │ Module │ │ Module │         │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │  │
│  │                                                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │                    Workflow Editor                        │   │  │
│  │  │  (SolidFlow - 可视化工作流编辑器)                           │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                              AI 服务层                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         AI SDK Adapter                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│  │  │   OpenAI    │  │  Anthropic  │  │   Google    │              │  │
│  │  │  Provider   │  │   Provider  │  │  Provider   │              │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │  │
│  │  │   Ollama    │  │    GGUF     │  │  ComfyUI    │              │  │
│  │  │   Local     │  │   Native    │  │    API      │              │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                              核心服务层                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Tauri Backend (Rust)                      │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │   File   │ │ Settings │ │ Inference│ │  Export  │            │  │
│  │  │ Service  │ │ Service  │ │  Service │ │ Service  │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│                              数据存储层                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  SQLite  │  │   JSON   │  │   Blob   │  │   Model  │             │
│  │    DB    │  │  Files   │  │  Storage │  │   Cache  │             │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘             │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 模块通信架构
```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (WebView)                        │
│                                                                  │
│  ┌──────────────────┐          ┌──────────────────────────────┐ │
│  │    Components    │◄────────►│         Stores               │ │
│  │                  │  Signals │    (createStore/Signal)      │ │
│  └────────┬─────────┘          └──────────────┬───────────────┘ │
│           │                                    │                 │
│           │ invoke()                           │ hooks           │
│           ▼                                    ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Tauri Bridge                          │   │
│  │                     (IPC Channel)                         │   │
│  └──────────────────────────┬───────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              │ IPC / FFI
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend (Rust)                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Command Handlers                       │   │
│  │  #[tauri::command]                                        │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│           ┌──────────────────┼──────────────────┐               │
│           ▼                  ▼                  ▼               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ File System  │  │  AI Engine   │  │   Database   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 模块设计

### 4.1 前端模块结构
```
src/
├── index.tsx                    # 应用入口
├── App.tsx                      # 根组件
├── index.css                    # 全局样式
│
├── routes/                      # 路由配置
│   ├── index.tsx                # 路由定义
│   ├── chat.tsx                 # 对话页面
│   ├── inference.tsx            # 推理页面
│   ├── models.tsx               # 模型管理
│   ├── settings.tsx             # 设置页面
│   └── workflow.tsx             # 工作流页面
│
├── components/                  # 可复用组件
│   ├── ui/                      # 基础 UI 组件 (shadcn-solid)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── nodes/                   # 工作流节点组件
│   │   ├── LLMNode.tsx
│   │   ├── PromptNode.tsx
│   │   └── ...
│   ├── ai-elements/             # AI 相关 UI 组件
│   │   ├── ChatMessage.tsx
│   │   ├── StreamingText.tsx
│   │   └── ...
│   ├── Sidebar.tsx              # 侧边栏
│   ├── ChatSessionPage.tsx      # 聊天会话页
│   ├── InferencePanel.tsx       # 推理面板
│   └── ...
│
├── features/                    # 功能模块
│   ├── novel/                   # 小说模块
│   │   ├── components/
│   │   ├── pages/
│   │   └── stores/
│   ├── comic/                   # 漫画模块
│   ├── audio/                   # 音频模块
│   └── video/                   # 视频模块
│
├── lib/                         # 工具库
│   ├── ai/                      # AI 工具
│   │   ├── providers.ts         # 模型提供商配置
│   │   ├── prompts.ts           # 提示词模板
│   │   └── streaming.ts         # 流式处理
│   ├── utils.ts                 # 通用工具函数
│   ├── cn.ts                    # 样式工具
│   └── tauri.ts                 # Tauri API 封装
│
└── assets/                      # 静态资源
    └── ...
```

### 4.2 后端模块结构
```
src-tauri/
├── src/
│   ├── main.rs                  # 应用入口
│   ├── lib.rs                   # 库入口/命令注册
│   ├── inference.rs             # 推理引擎
│   │
│   └── commands/                # Tauri 命令
│       ├── mod.rs               # 模块导出
│       ├── file.rs              # 文件操作
│       ├── gguf.rs              # GGUF 模型命令
│       ├── qwen3vl.rs           # Qwen 视觉命令
│       ├── settings.rs          # 设置命令
│       ├── chat.rs              # 聊天命令
│       └── export.rs            # 导出命令
│
├── ai_base/                     # AI 基础库
│   └── src/
│       ├── lib.rs
│       ├── error.rs             # 错误处理
│       ├── config.rs            # 配置管理
│       ├── models/              # 模型实现
│       │   ├── mod.rs
│       │   ├── gguf/            # GGUF 模型
│       │   │   ├── mod.rs
│       │   │   ├── loader.rs    # 模型加载
│       │   │   └── inference.rs # 推理逻辑
│       │   └── qwen3vl/         # Qwen 视觉模型
│       │       ├── mod.rs
│       │       ├── processor.rs # 图像处理
│       │       └── inference.rs
│       └── utils/
│           ├── mod.rs
│           ├── tokenizer.rs     # 分词器
│           └── sampling.rs      # 采样策略
│
├── capabilities/                # Tauri 权限配置
├── icons/                       # 应用图标
├── models/                      # 本地模型存储
├── tauri.conf.json              # Tauri 配置
├── Cargo.toml                   # Rust 依赖
└── build.rs                     # 构建脚本
```

### 4.3 模块依赖关系
```
                    ┌─────────────────────┐
                    │        App          │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│     Routes      │  │   Components    │  │    Features     │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         │  ┌─────────────────┴────────────────────┘
         │  │
         ▼  ▼
┌─────────────────────────────────────────────────────────────┐
│                            lib/                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │    ai    │  │  utils   │  │  tauri   │  │    cn    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                               │
                               │ invoke()
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tauri Backend                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 数据流与状态管理

### 5.1 状态管理方案

#### 5.1.1 局部状态 (createSignal)
适用于组件内部状态，不需要跨组件共享。

```typescript
// 组件内部状态
const [isOpen, setIsOpen] = createSignal(false);
const [inputValue, setInputValue] = createSignal("");
```

#### 5.1.2 派生状态 (createMemo)
适用于从其他状态计算得出的值。

```typescript
const [items, setItems] = createSignal<Item[]>([]);

// 派生状态
const totalCount = createMemo(() => items().length);
const completedCount = createMemo(() => 
  items().filter(item => item.completed).length
);
```

#### 5.1.3 全局状态 (createStore)
适用于跨组件共享的复杂状态。

```typescript
// lib/stores/chatStore.ts
import { createStore } from "solid-js/store";

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, Message[]>;
}

const [state, setState] = createStore<ChatState>({
  sessions: [],
  activeSessionId: null,
  messages: {},
});

export const chatStore = {
  state,
  
  setActiveSession(id: string) {
    setState("activeSessionId", id);
  },
  
  addMessage(sessionId: string, message: Message) {
    setState("messages", sessionId, (msgs = []) => [...msgs, message]);
  },
};
```

#### 5.1.4 Context Provider
适用于依赖注入和主题等全局配置。

```typescript
// lib/contexts/ThemeContext.tsx
import { createContext, useContext } from "solid-js";

interface ThemeContextValue {
  theme: () => "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>();

export function ThemeProvider(props: { children: JSX.Element }) {
  const [theme, setTheme] = createSignal<"light" | "dark">("dark");
  
  const value = createMemo(() => ({
    theme,
    toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light"),
  }));
  
  return (
    <ThemeContext.Provider value={value()}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

### 5.2 数据流架构
```
┌─────────────────────────────────────────────────────────────────┐
│                         用户交互                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        组件 (Component)                          │
│  ┌─────────────────┐      ┌─────────────────────────────────┐   │
│  │   Event Handler │─────►│         Action / Setter         │   │
│  └─────────────────┘      └─────────────────────────────────┘   │
└────────────────────────────────────────┬────────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         ┌─────────────────┐                      ┌─────────────────┐
         │   Store/Signal  │                      │   Tauri invoke  │
         │    (同步更新)    │                      │    (异步请求)    │
         └────────┬────────┘                      └────────┬────────┘
                  │                                        │
                  │                                        ▼
                  │                           ┌─────────────────────┐
                  │                           │   Backend (Rust)     │
                  │                           │   - 文件操作          │
                  │                           │   - 数据库查询        │
                  │                           │   - AI 推理          │
                  │                           └─────────┬───────────┘
                  │                                     │
                  │◄────────────────────────────────────┘
                  │              返回结果
                  ▼
         ┌─────────────────┐
         │    UI 更新       │
         │  (响应式渲染)    │
         └─────────────────┘
```

### 5.3 AI 对话数据流
```
         用户输入
            │
            ▼
    ┌───────────────┐
    │  生成请求消息  │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐     ┌───────────────┐
    │  添加到消息列表 │────►│   显示加载态   │
    └───────┬───────┘     └───────────────┘
            │
            ▼
    ┌───────────────────────────────┐
    │     调用 AI SDK streamText    │
    │  (根据配置选择 Local/Cloud)   │
    └───────────────┬───────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
   ┌───────────┐        ┌───────────┐
   │  流式 Token │        │  完成回调  │
   │   (onToken) │        │ (onFinish)│
   └─────┬─────┘        └─────┬─────┘
         │                     │
         ▼                     ▼
   ┌───────────┐        ┌───────────┐
   │  更新消息   │        │  保存到 DB │
   │  (实时显示) │        │  更新状态   │
   └───────────┘        └───────────┘
```

---

## 6. AI 集成层

### 6.1 模型路由架构
```typescript
// lib/ai/router.ts
interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local';
  capabilities: ('chat' | 'vision' | 'embedding' | 'tools')[];
  costPerToken?: number;
  maxTokens: number;
  isLocal: boolean;
}

class ModelRouter {
  private models: Map<string, ModelConfig> = new Map();
  
  // 根据任务选择最优模型
  selectModel(task: {
    type: 'chat' | 'vision' | 'embedding';
    priority: 'cost' | 'speed' | 'quality';
    requireLocal?: boolean;
    maxTokens?: number;
  }): ModelConfig {
    const candidates = Array.from(this.models.values()).filter(m => {
      if (task.requireLocal && !m.isLocal) return false;
      if (!m.capabilities.includes(task.type)) return false;
      if (task.maxTokens && m.maxTokens < task.maxTokens) return false;
      return true;
    });
    
    // 根据优先级排序
    switch (task.priority) {
      case 'cost':
        return candidates.sort((a, b) => 
          (a.costPerToken ?? Infinity) - (b.costPerToken ?? Infinity)
        )[0];
      case 'speed':
        return candidates.filter(m => m.isLocal)[0] ?? candidates[0];
      case 'quality':
        return candidates.find(m => m.provider === 'openai') ?? candidates[0];
    }
  }
}
```

### 6.2 Provider 抽象层
```typescript
// lib/ai/providers.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export function createProvider(config: ProviderConfig) {
  switch (config.type) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
      
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
      });
      
    case 'ollama':
      return createOpenAICompatible({
        name: 'ollama',
        baseURL: config.baseURL ?? 'http://localhost:11434/v1',
      });
      
    case 'local-gguf':
      // 通过 Tauri 命令调用本地模型
      return createLocalGGUFProvider(config);
  }
}
```

### 6.3 工具调用 (Tool Calling)
```typescript
// lib/ai/tools.ts
import { tool } from 'ai';
import { z } from 'zod';
import { invoke } from '@tauri-apps/api/core';

// 文件读取工具
export const readFileTool = tool({
  description: '读取本地文件内容',
  parameters: z.object({
    path: z.string().describe('文件路径'),
  }),
  execute: async ({ path }) => {
    const content = await invoke<string>('read_file', { path });
    return content;
  },
});

// 网页搜索工具
export const searchWebTool = tool({
  description: '搜索互联网获取信息',
  parameters: z.object({
    query: z.string().describe('搜索关键词'),
  }),
  execute: async ({ query }) => {
    // 实现搜索逻辑
  },
});

// 图像生成工具
export const generateImageTool = tool({
  description: '根据描述生成图像',
  parameters: z.object({
    prompt: z.string().describe('图像描述'),
    style: z.enum(['realistic', 'anime', 'cartoon']).optional(),
  }),
  execute: async ({ prompt, style }) => {
    // 调用图像生成 API
  },
});
```

### 6.4 流式处理
```typescript
// lib/ai/streaming.ts
import { streamText, createDataStreamResponse } from 'ai';

export async function* streamChatResponse(
  model: LanguageModel,
  messages: Message[],
  onProgress?: (text: string) => void,
): AsyncGenerator<string> {
  const result = await streamText({
    model,
    messages,
    onChunk: ({ chunk }) => {
      if (chunk.type === 'text-delta') {
        onProgress?.(chunk.textDelta);
      }
    },
  });
  
  for await (const chunk of result.textStream) {
    yield chunk;
  }
}
```

---

## 7. 安全架构

### 7.1 API Key 管理
```rust
// src-tauri/src/commands/settings.rs
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub async fn set_api_key(
    app: tauri::AppHandle,
    provider: String,
    key: String,
) -> Result<(), String> {
    let store = StoreBuilder::new(app, "credentials.dat")
        .build()?;
    
    // 加密存储
    let encrypted = encrypt(&key)?;
    store.set(&provider, encrypted)?;
    store.save()?;
    
    Ok(())
}

#[tauri::command]
pub async fn get_api_key(
    app: tauri::AppHandle,
    provider: String,
) -> Result<Option<String>, String> {
    let store = StoreBuilder::new(app, "credentials.dat")
        .build()?;
    
    if let Some(encrypted) = store.get(&provider) {
        let decrypted = decrypt(&encrypted)?;
        return Ok(Some(decrypted));
    }
    
    Ok(None)
}
```

### 7.2 权限控制
```json
// src-tauri/capabilities/default.json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Capability for the main window",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-save",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-app-write",
    "fs:allow-app-read",
    "http:default",
    "store:allow-get",
    "store:allow-set"
  ]
}
```

### 7.3 输入验证
```rust
// src-tauri/src/commands/file.rs
use std::path::Path;

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    // 路径验证
    let path = Path::new(&path);
    
    // 防止路径遍历攻击
    if path.components().any(|c| matches!(c, std::path::Component::ParentDir)) {
        return Err("Invalid path: parent directory traversal not allowed".into());
    }
    
    // 检查文件是否在允许的目录内
    let allowed_dirs = get_allowed_directories()?;
    if !allowed_dirs.iter().any(|dir| path.starts_with(dir)) {
        return Err("Access denied: path is outside allowed directories".into());
    }
    
    std::fs::read_to_string(path)
        .map_err(|e| e.to_string())
}
```

### 7.4 内容安全
```typescript
// lib/ai/safety.ts
const BLOCKED_PATTERNS = [
  /violence/i,
  /explicit/i,
  // ... 更多模式
];

export function checkContentSafety(content: string): {
  safe: boolean;
  reason?: string;
} {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason: 'Content contains blocked patterns' };
    }
  }
  return { safe: true };
}

export function filterOutput(text: string): string {
  // 过滤敏感内容
  return text.replace(/敏感词/g, '***');
}
```

---

## 8. 性能优化

### 8.1 前端优化

#### 8.1.1 虚拟列表
```typescript
// components/VirtualList.tsx
import { For, createMemo, createSignal } from 'solid-js';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => JSX.Element;
}

export function VirtualList<T>(props: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = createSignal(0);
  
  const visibleRange = createMemo(() => {
    const start = Math.floor(scrollTop() / props.itemHeight);
    const visible = Math.ceil(props.containerHeight / props.itemHeight);
    const end = Math.min(start + visible + 1, props.items.length);
    return { start, end };
  });
  
  const visibleItems = createMemo(() => {
    const { start, end } = visibleRange();
    return props.items.slice(start, end).map((item, i) => ({
      item,
      index: start + i,
    }));
  });
  
  return (
    <div
      class="overflow-auto"
      style={{ height: `${props.containerHeight}px` }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: `${props.items.length * props.itemHeight}px`, position: 'relative' }}>
        <For each={visibleItems()}>
          {({ item, index }) => (
            <div
              style={{
                position: 'absolute',
                top: `${index * props.itemHeight}px`,
                height: `${props.itemHeight}px`,
              }}
            >
              {props.renderItem(item, index)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
```

#### 8.1.2 懒加载
```typescript
// routes/index.tsx
import { lazy } from 'solid-js';

// 懒加载路由组件
export const routes = [
  {
    path: '/novel',
    component: lazy(() => import('../features/novel/pages/NovelHome')),
  },
  {
    path: '/comic',
    component: lazy(() => import('../features/comic/pages/ComicHome')),
  },
  // ...
];
```

#### 8.1.3 缓存计算结果
```typescript
// 使用 createMemo 缓存昂贵计算
const [messages, setMessages] = createSignal<Message[]>([]);

const tokenCount = createMemo(() => {
  // 只在 messages 变化时重新计算
  return messages().reduce((sum, msg) => sum + countTokens(msg.content), 0);
});

const formattedMessages = createMemo(() => {
  // 只在 messages 变化时重新格式化
  return messages().map(msg => formatMessage(msg));
});
```

### 8.2 后端优化

#### 8.2.1 模型预加载
```rust
// src-tauri/ai_base/src/models/gguf/mod.rs
use std::sync::Arc;
use tokio::sync::RwLock;
use once_cell::sync::Lazy;

// 全局模型缓存
static MODEL_CACHE: Lazy<RwLock<HashMap<String, Arc<Model>>>> = 
    Lazy::new(|| RwLock::new(HashMap::new()));

pub async fn get_or_load_model(path: &str) -> Result<Arc<Model>, Error> {
    // 先检查缓存
    {
        let cache = MODEL_CACHE.read().await;
        if let Some(model) = cache.get(path) {
            return Ok(Arc::clone(model));
        }
    }
    
    // 加载模型
    let model = Arc::new(Model::load(path)?);
    
    // 写入缓存
    {
        let mut cache = MODEL_CACHE.write().await;
        cache.insert(path.to_string(), Arc::clone(&model));
    }
    
    Ok(model)
}
```

#### 8.2.2 并发控制
```rust
// src-tauri/src/inference.rs
use tokio::sync::Semaphore;
use std::sync::Arc;

// 限制并发推理请求
static INFERENCE_SEMAPHORE: Lazy<Arc<Semaphore>> = 
    Lazy::new(|| Arc::new(Semaphore::new(2))); // 最多 2 个并发

pub async fn run_inference(request: InferenceRequest) -> Result<String, Error> {
    // 获取许可
    let _permit = INFERENCE_SEMAPHORE.acquire().await?;
    
    // 执行推理
    do_inference(request).await
}
```

#### 8.2.3 批量处理
```rust
// 批量处理 TTS 请求
pub async fn batch_tts(
    texts: Vec<String>,
    voice_id: &str,
) -> Result<Vec<AudioBuffer>, Error> {
    let futures: Vec<_> = texts
        .into_iter()
        .map(|text| generate_speech(text, voice_id))
        .collect();
    
    // 并行执行
    let results = futures::future::join_all(futures).await;
    
    results.into_iter().collect()
}
```

### 8.3 内存优化

#### 8.3.1 流式处理大文件
```rust
// 流式读取大文件
use tokio::io::{AsyncBufReadExt, BufReader};

pub async fn process_large_file(path: &str) -> Result<(), Error> {
    let file = tokio::fs::File::open(path).await?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();
    
    while let Some(line) = lines.next_line().await? {
        // 逐行处理，避免一次性加载整个文件
        process_line(&line)?;
    }
    
    Ok(())
}
```

#### 8.3.2 模型量化
```rust
// 支持不同量化等级
pub enum Quantization {
    Q4_0,  // 4-bit 量化，内存占用最小
    Q4_1,
    Q5_0,
    Q5_1,
    Q8_0,  // 8-bit 量化，质量更好
    F16,   // 半精度
    F32,   // 全精度
}

pub fn load_model_with_quantization(
    path: &str,
    quant: Quantization,
) -> Result<Model, Error> {
    // 根据可用内存自动选择量化等级
    let available_memory = get_available_memory()?;
    let quant = if available_memory < 8 * GB {
        Quantization::Q4_0
    } else if available_memory < 16 * GB {
        Quantization::Q8_0
    } else {
        quant
    };
    
    Model::load_quantized(path, quant)
}
```

---

## 9. 部署架构

### 9.1 桌面应用打包
```yaml
# .github/workflows/build.yml
name: Build & Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        platform:
          - os: windows-latest
            target: x86_64-pc-windows-msvc
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu

    runs-on: ${{ matrix.platform.os }}

    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform.target }}
          
      - name: Install pnpm
        run: npm install -g pnpm
        
      - name: Install dependencies
        run: pnpm install
        
      - name: Build Tauri app
        run: pnpm tauri build --target ${{ matrix.platform.target }}
        
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: app-${{ matrix.platform.target }}
          path: src-tauri/target/${{ matrix.platform.target }}/release/bundle/
```

### 9.2 更新机制
```rust
// src-tauri/src/update.rs
use tauri_plugin_updater::UpdaterExt;

pub async fn check_for_updates(app: tauri::AppHandle) -> Result<bool, Error> {
    let updater = app.updater_builder()
        .timeout(Duration::from_secs(30))
        .build()?;
    
    let update = updater.check().await?;
    
    if let Some(update) = update {
        // 下载并安装更新
        update.download_and_install(|progress, total| {
            println!("Downloaded {} of {} bytes", progress, total.unwrap_or(0));
        }, || {
            println!("Download complete, restarting...");
        }).await?;
        
        return Ok(true);
    }
    
    Ok(false)
}
```

### 9.3 错误收集
```typescript
// lib/telemetry.ts
export function initErrorTracking() {
  window.onerror = (message, source, lineno, colno, error) => {
    // 发送到错误收集服务 (可选)
    if (getUserConsent()) {
      reportError({
        message: String(message),
        source,
        lineno,
        colno,
        stack: error?.stack,
        timestamp: Date.now(),
        version: APP_VERSION,
      });
    }
    
    // 同时记录到本地日志
    logError(error);
  };
}
```

---

## 10. 开发规范

### 10.1 代码风格
详见 [agents.md](../../agents.md)

### 10.2 Git 工作流
```
main          ─────●─────●─────●─────●───►
                   │     ▲     │     ▲
                   │     │     │     │
develop       ─────●─────●─────●─────●───►
                   │     ▲     │     ▲
                   │     │     │     │
feature/xxx   ─────●─────●     │     │
                         │     │     │
feature/yyy   ────────────●────●     │
                               │     │
release/1.0   ─────────────────●─────●
```

### 10.3 提交规范
```
<type>(<scope>): <subject>

<body>

<footer>

# 类型
feat:     新功能
fix:      Bug 修复
docs:     文档更新
style:    代码格式（不影响功能）
refactor: 重构（不新增功能，不修复 bug）
perf:     性能优化
test:     测试相关
chore:    构建/工具相关

# 示例
feat(chat): 添加流式响应显示

实现了 AI 对话的流式显示功能，用户可以实时看到 AI 的回复内容。

- 使用 ai-sdk 的 streamText API
- 添加打字机效果动画
- 支持中断生成

Closes #123
```

### 10.4 代码审查检查清单
- [ ] 代码通过 TypeScript 类型检查
- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 Clippy 检查 (Rust)
- [ ] 新功能有对应的测试
- [ ] 文档已更新
- [ ] 没有引入安全漏洞
- [ ] 性能没有退化
- [ ] UI 符合设计规范

---

## 附录

### A. 相关文档
- [产品设计文档 (PRD)](../product/PRD.md)
- [UI/UX 设计规范](../design/UIUX.md)
- [API 参考文档](./API_Reference.md)
- [小说模块架构](./AIGC_Novel_Architecture.md)
- [漫画模块架构](./AIGC_Comic_Architecture.md)
- [音频模块架构](./AIGC_Audio_Architecture.md)
- [视频模块架构](./AIGC_Video_Architecture.md)

### B. 外部资源
- [SolidJS 官方文档](https://www.solidjs.com/)
- [Tauri v2 文档](https://v2.tauri.app/)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/)
- [Rust 官方文档](https://www.rust-lang.org/learn)
