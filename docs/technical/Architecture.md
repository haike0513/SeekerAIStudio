# SeekerAIStudio 技术架构

## 1. 系统概述
SeekerAIStudio 是一个混合桌面应用程序，利用 Web 技术构建 UI，利用 Rust (Tauri) 处理系统级操作。它采用模块化架构设计，旨在实现高性能、安全性和可扩展性。

## 2. 技术栈

### 2.1 核心框架
- **运行时**: [Tauri v2](https://tauri.app/) (Rust + WebView) - 提供轻量级、安全的桌面环境。
- **前端引擎**: [SolidJS](https://www.solidjs.com/) - 高性能响应式 UI 框架。
- **语言**: TypeScript - 用于类型安全的应用程序逻辑。

### 2.2 UI 与样式
- **样式**: [TailwindCSS v4](https://tailwindcss.com/) - 实用优先的 CSS 框架。
- **组件原语**: 
  - `kobalte` & `radix` (通过 `@ensolid/radix`) 用于无障碍 UI 原语。
  - `lucide-solid` 用于图标。
  - `class-variance-authority` (CVA) 用于组件变体管理。
- **可视化**: 
  - `@ensolid/solidflow` 用于基于节点的工作流编辑器。
  - `@ensolid/visx` 用于数据可视化。

### 2.3 状态管理与数据
- **状态 (State)**: SolidJS Signals 和 Stores 用于细粒度的响应性。
- **数据获取**: `@tanstack/solid-query` 用于异步状态管理。
- **存储**: `@solid-primitives/storage` 与本地存储和 Tauri 文件系统 API 交互。
- **表单**: `@tanstack/solid-form` 用于复杂的输入处理。

### 2.4 AI 与逻辑层
- **AI 集成**: Vercel AI SDK (`ai`, `@ai-sdk/openai-compatible`) 用于标准化的 LLM 交互。
- **工具**: `throttleit`, `nanoid` 用于性能和工具需求。

## 3. 架构图

### 3.1 应用程序结构
```mermaid
graph TD
    A[Tauri Core (Rust)] <-->|IPC| B[WebView (SolidJS)]
    B --> C[工作流引擎 Workflow Engine]
    B --> D[市场界面 Marketplace Interface]
    B --> E[设置与配置 Settings & Config]
    C --> F[SolidFlow 渲染器]
    C --> G[执行控制器 Execution Controller]
    G -->|API| H[LLM 提供商]
    D -->|Web3| I[区块链网络]
```

### 3.2 数据流
1.  **用户操作**：用户与 UI 交互（例如，添加节点）。
2.  **状态更新**：SolidJS signal 更新，触发响应性。
3.  **持久化**：更改通过 Tauri API 或 LocalStorage 保存到本地文件系统。
4.  **执行**：运行工作流时，“执行控制器”遍历节点，根据需要调用 AI 提供商的 API。

## 4. 安全与性能
- **隔离**：Tauri 模式确保 WebView 的严格沙盒化。
- **响应性**：SolidJS 确保最小的 DOM 更新，这对大型图形渲染至关重要。
- **类型安全**：前端代码库的全 TypeScript 覆盖。
