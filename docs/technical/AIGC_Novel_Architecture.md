# AIGC 小说创作助手 - 技术架构文档

## 1. 架构概览
本模块基于 **SolidJS** + **Tauri** 构建，复用 SeekerAIStudio 现有的 `ai-sdk` 基础设施。核心在于如何高效管理长文本上下文（Context Window）以及如何将小说结构化数据与 LLM 进行交互。

## 2. 数据层设计 (Data Layer)

### 2.1 数据模型 (Schema)
由于小说包含大量文本和关联关系，我们需要一个结构化的 JSON 存储方案，或者轻量级本地数据库。

```typescript
// Book Project Structure
interface BookProject {
  id: string;
  metadata: {
    title: string;
    author: string;
    genre: string;
    created_at: number;
  };
  settings: {
    world_view: string; // 世界观
    writing_style: string; // 写作风格 Prompt
  };
  characters: Character[]; // 角色列表
  chapters: ChapterNode[]; // 章节树
}

interface ChapterNode {
  id: string;
  title: string;
  parentId: string | null; //以此支持卷、章嵌套
  order: number;
  summary: string; // 章节梗概
  content: string; // 正文内容 (Markdown)
}

interface Character {
  id: string;
  name: string;
  avatar?: string;
  bio: string;
  traits: string[];
}
```

### 2.2 存储 (Storage)
- **Local File System**: 每个小说项目保存为一个文件夹，包含 `project.json` 和 `chapters/` 目录（避免单文件过大）。
- **Tauri FS API**: 用于读写本地文件。

## 3. AI 交互层 (AI Integration)

### 3.1 Vercel AI SDK 集成
- 使用 `useChat` 处理侧边栏助手对话。
- 使用 `generateText` / `streamText` 处理正文续写和润色。
- **Prompt Engineering**: 
  - **System Prompt**: 动态注入当前书的设定、风格要求。
  - **Context Injection**: 在生成当前章节时，自动提取：
    1. 上一章的结尾（提供连贯性）。
    2. 当前章的大纲（提供方向）。
    3. 提及的角色的设定（提供准确性）。

### 3.2 向量检索 (RAG) - *Roadmap Phase 2*
- 对于长篇小说（> 20万字），上下文窗口不足以容纳全文。
- 引入轻量级向量库（如基于 WASM 的 vector store 或调用 Local API）。
- 将旧章节切片存入，生成新内容时检索相关历史剧情。

## 4. 前端组件架构 (Component Architecture)

### 4.1 目录结构
```
src/
  features/
    novel/
      components/
        Editor/          # TipTap 或 CodeMirror 封装
        Sidebar/         # 章节树、角色卡
        Copilot/         # AI 助手面板
        Export/          # 导出逻辑
      hooks/
        useNovelStore.ts # 状态管理 (基于 Solid Store)
        useAutoSave.ts   # 自动保存逻辑
      utils/
        prompt-builder.ts # Prompt 组装工厂
```

### 4.2 编辑器选型
- 推荐使用 **TipTap** (Headless WYSIWYG based on ProseMirror) 或 **CodeMirror**。
- 需定制 Extension 以支持 "Ghost Text" (AI 建议文本) 的渲染。

## 5. 性能优化
- **虚拟滚动**: 章节列表较长时使用虚拟列表。
- **按需加载**: 不一次性加载全书内容，仅加载当前选中章节。
