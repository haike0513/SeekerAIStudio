# AIGC 漫画创作助手 - 技术架构文档

## 1. 架构概览
前端使用 SolidJS + Canvas API (或 SVG/HTML DOM 混合渲染) 构建排版引擎。后端依赖 Stable Diffusion (SD) 生态进行图像生成。

## 2. 数据结构 (Data Schema)

```typescript
interface ComicProject {
  id: string;
  pages: ComicPage[];
  characters: ComicCharacter[]; // 关联 LoRA/Embedding 信息
}

interface ComicPage {
  id: string;
  width: number;
  height: number;
  panels: ComicPanel[];
  bubbles: Bubble[];
}

interface ComicPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  
  // Generation Data
  prompt: string;
  negativePrompt: string;
  seed: number;
  modelId: string;
  imageUrl?: string; // 生成结果的本地路径
}

interface Bubble {
  id: string;
  text: string;
  x: number;
  y: number;
  style: "speech" | "thought" | "shout";
}
```

## 3. 图像生成管线 (Generation Pipeline)

### 3.1 方案 A: 远程 API (当前阶段)
- 调用 DALL-E 3 或 Midjourney (via Proxy) API。
- 优点：无需本地算力，画质高。
- 缺点：角色一致性难控制，成本高。

### 3.2 方案 B: 本地/局域网 SD API (目标方案)
- 连接用户本地运行的 **Qualcomm AI Stack** 或 **ComfyUI** (监听 8188 端口)。
- **SeekerAIStudio** 作为 API Client 发送生成请求。
- **Payload 构造**:
  - 将分镜的宽高比映射为 SD 的分辨率。
  - 将角色 Prompt 拼接。

## 4. 前端渲染技术
- **排版引擎**: 考虑到漫画主要是矩形格子 + 气泡，使用绝对定位的 HTML/CSS (`div`, `img`) 配合 SVG (`svg` for bubbles) 足够且性能好。无需重型 Canvas 引擎 (如 Konva/Fabric) 除非需要复杂的徒手绘画功能。
- **拖拽库**: `@dnd-kit/core` 或原生 Drag & Drop API。

## 5. 项目结构
```
src/features/comic/
  components/
    Board/          # 画布区域
      Page.tsx
      Panel.tsx
      Bubble.tsx
    Sidebar/        # 左侧资源
    Inspector/      # 右侧属性
  logic/
    sd-client.ts    # Stable Diffusion API 客户端
  stores/
    comicStore.ts   # 状态管理
```
