# SeekerAIStudio 技术架构

## 1. 系统概述
SeekerAIStudio 采用现代化的 Web 技术栈构建，利用 `ai-sdk` 作为智能核心，实现了对本地模型和云端 API 的统一抽象。系统旨在提供低延迟、高扩展性的 Agent 编排与 AI 应用运行环境。

## 2. 技术栈

### 2.1 核心框架
- **Runtime**: [Tauri v2](https://tauri.app/) - 跨平台桌面运行时，负责文件系统访问、本地服务调度。
- **Frontend**: [SolidJS](https://www.solidjs.com/) - 响应式前端框架，配合 Signals 实现高频 AI 流式输出的高效渲染。
- **Language**: TypeScript - 全栈类型安全。

### 2.2 AI 与逻辑层 (核心升级)
- **SDK**: **[Vercel AI SDK](https://sdk.vercel.ai/docs)** (Core & UI)
  - `ai`: 核心流式传输 (Streaming) 协议支持。
  - `@ai-sdk/openai`: 标准化 OpenAI 兼容接口。
  - `@ai-sdk/anthropic` / `@ai-sdk/mistral`: 多模型提供商支持。
- **Local AI Bridge**: 
  - 通过 `Ollama` 接口协议对接本地模型，由 `ai-sdk` 的 OpenAI Compatible Provider 统一驱动。
- **Agent Capabilities**:
  - **Tool Calling**: 利用 SDK 的 `tool` 定义能力，实现智能体对系统功能（读写文件、网络请求）的调用。
  - **Structure Generation**: 使用 `generateObject` / `streamObject` 保证工作流节点间的数据契约。

### 2.3 数据流与状态管理
- **Workflow State**: `@ensolid/solidflow` 维护图结构数据。
- **Execution Context**: 运行时创建一个基于 `ai-sdk` 的执行上下文，管理 API Keys、本地服务端点地址和上下文记忆。
- **Storage**: 基于 Tauri FileSystem 和 SQLite（可选）存储向量数据和会话历史。

## 3. 架构图

### 3.1 智能体运行架构
```mermaid
graph TD
    User[用户输入] --> UI[SolidJS 界面]
    UI -->|配置/指令| AgentRuntime[Agent 运行时 (Tauri)]
    
    subgraph "AI Kernel (Powered by ai-sdk)"
        Router[模型路由]
        Tools[工具注册表]
        Memory[短期记忆/Context]
    end
    
    AgentRuntime --> Router
    AgentRuntime --> Tools
    
    Router -->|选择 Cloud| CloudAPI[云端 API (OpenAI/Anthropic)]
    Router -->|选择 Local| LocalLLM[本地模型 (Ollama/DeepSeek)]
    
    CloudAPI -->|Stream| UI
    LocalLLM -->|Stream| UI
    
    Tools -->|执行结果| Router
```

### 3.2 关键模块交互
1.  **节点执行器**: 每个工作流节点作为一个微型 Agent，通过 `ai-sdk` 发起请求。
2.  **流式管道**: LLM 的 Token 流通过 `streamText` 直接通过 IPC 通道传输至前端组件，实现打字机效果。
3.  **工具沙箱**: 为 Agent 提供的工具在受限的 Tauri 命令环境中运行，确保安全性（例如限制文件访问范围）。

## 4. 性能与安全
- **API Key 管理**: 敏感 Key 存储在系统级安全存储中（Tauri Store Plugin），不通过网络明文传输。
- **本地优先策略**: 默认推荐使用本地模型进行开发调试，降低 Token 成本，保护数据隐私。
- **并发控制**: 利用 `p-queue` 或类似机制管理对本地模型的并发请求，避免显存溢出。
