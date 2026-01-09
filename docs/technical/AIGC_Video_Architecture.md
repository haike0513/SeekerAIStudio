# AIGC 视频创作助手 - 技术架构文档

## 1. 架构概览
前端基于 SolidJS 和 ffmpeg.wasm (或服务端渲染合成)。后端对接视频生成模型。

## 2. 数据结构 (Data Schema)

```typescript
interface VideoProject {
  id: string;
  title: string;
  resolution: { width: number, height: number };
  fps: number;
  tracks: VideoTrack[];
}

interface VideoTrack {
  id: string;
  type: "video" | "audio" | "text" | "effect";
  clips: VideoClip[];
}

interface VideoClip {
  id: string;
  trackId: string;
  startTime: number; // In timeline (seconds)
  duration: number;
  sourceType: "local" | "generated";
  sourceUrl: string;
  offset: number; // Trim start
  
  // Generation Params (for re-generation)
  prompt?: string;
  baseImage?: string;
  seed?: number;
}
```

## 3. 视频渲染引擎 (Video Engine)
- **预览模式**:
  - 使用 HTML5 `<video>` 标签组合。
  - 简单的 CSS `transform` / `opacity` 做转场预览。
- **导出模式**:
  - **Client-side**: 使用 `ffmpeg.wasm` 在浏览器中逐帧合成 (性能较差，适合短片)。
  - **Server-side**: 将 Project JSON 发送到后端，后端使用 Python (MoviePy / FFmpeg) 进行高质量渲染并返回 URL。

## 4. 模型集成方案
- **Stable Video Diffusion (SVD)**:
  - 部署在本地 Python 后端 (ComfyUI API)。
  - 支持 I2V (Image to Video)。
- **AnimateDiff**:
  - 适合风格化视频生成。

## 5. 项目结构
```
src/features/video/
  components/
    Timeline/       # 视频剪辑时间轴
    Player/         # 播放器组件
    Generator/      # 视频生成面板
  logic/
    videoProject.ts # 项目逻辑
  stores/
    videoStore.ts   # 状态管理
```
