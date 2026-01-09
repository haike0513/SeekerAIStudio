# AIGC 音频创作助手 - 技术架构文档

## 1. 架构概览
前端使用 SolidJS + Web Audio API 构建简易 DAW 引擎。后端连接 TTS 和 Audio 生成模型。

## 2. 数据结构 (Data Schema)

```typescript
interface AudioProject {
  id: string;
  title: string;
  duration: number; // 总时长 (秒)
  tracks: AudioTrack[];
}

interface AudioTrack {
  id: string;
  name: string;
  type: "voice" | "sfx" | "music";
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  isSolo: boolean;
  clips: AudioClip[];
}

interface AudioClip {
  id: string;
  trackId: string;
  startTime: number; // 开始时间 (秒)
  duration: number; // 持续时间 (秒)
  sourceUrl: string; // Blob URL 或本地文件路径
  
  // Generation Metadata
  prompt?: string;     // for SFX/Music
  text?: string;       // for TTS
  speakerId?: string;  // for TTS
}
```

## 3. 音频处理引擎 (Audio Engine)
- **Web Audio API**: 使用 `AudioContext` 进行混音和播放。
- **Waveform Visualization**: 使用 `wavesurfer.js` (或者自己绘制 Canvas) 渲染波形。
- **Scheduling**: 精确控制 `AudioBufferSourceNode.start(time)` 来实现多轨同步播放。

## 4. 模型集成方案
- **TTS**:
  - **Edge TTS**: 免费、快速，适合预览。
  - **ChatTTS / VITS**: 本地 Python API 调用，高质量情感控制。
- **AudioLDM / MusicGen**:
  - 用 HuggingFace Inference API 或 本地 ComfyUI 节点生成。

## 5. 项目结构
```
src/features/audio/
  components/
    Timeline/       # 时间轴组件
      Track.tsx
      Clip.tsx
      Ruler.tsx
    Sidebar/        # 资产库
    Inspector/      # 右侧属性面板
  logic/
    audioEngine.ts  # Web Audio API 封装 (Play, Pause, Mix)
  stores/
    audioStore.ts   # 状态管理
```
