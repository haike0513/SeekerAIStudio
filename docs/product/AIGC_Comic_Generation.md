# AIGC 漫画创作助手 (AIGC Comic Creator) - 产品需求文档 (PRD)

## 1. 产品概述
**AIGC 漫画创作助手** 是 SeekerAIStudio 的视觉化叙事模块，旨在让非绘画专业的用户也能创作高质量的漫画作品。它利用 T2I (Text-to-Image) 技术生成画面，并结合排版工具进行分镜组合。

## 2. 目标用户
- **小说作者**: 希望将自己的文字作品视觉化。
- **分镜师**: 快速制作 Storyboard 验证构图。
- **Meme/条漫创作者**: 快速生产社交媒体传播的短漫。

## 3. 核心功能模块

### 3.1 剧本转分镜 (Script to Storyboard)
- **智能拆解**: 输入一段小说文本，AI 自动将其拆解为多个“分镜描述 (Panel Prompts)”。
- **画面描述优化**: 自动补充光影、构图、风格关键词（如 "Cinematic lighting", "Low angle"）。

### 3.2 角色一致性管理 (Character Consensus)
- **角色库 (Character Bank)**: 与小说模块的角色库互通。
- **特征锁定 (Feature Locking)**: 利用 Seed 或 Reference Image (ControlNet/IP-Adapter) 确保同一角色在不同格子中长相一致。
- **表情/姿态控制**: 通过下拉菜单选择角色的 Emotion 和 Pose。

### 3.3 画布编辑器 (Canvas Editor)
- **格子布局 (Grid Layout)**: 预设多种漫画分镜模板（四格、日漫页漫、Webtoon长条）。
- **图层编辑**: 背景图、角色层、气泡层分离。
- **智能气泡 (Smart Bubbles)**: 自动根据文本长度调整气泡大小，支持多种气泡样式（对话、独白、喊叫）。

### 3.4 图像生成工作台 (Generation Workbench)
- **模型选择**: 支持 SDXL, FLUX, 或 DALL-E 3。
- **局部重绘 (Inpainting)**: 修复画面中的崩坏细节（如手部）。
- **风格滤镜**: 统一全漫的画风（黑白、美漫、赛博朋克）。

## 4. 用户流程 (User Flow)
1. **创建项目**: 选择画布尺寸（页漫 A4 或 条漫）。
2. **导入剧本**: 粘贴文本或从 Novel 模块导入章节。
3. **生成分镜**: AI 提炼出 Keyframes。
4. **生成图像**: 
   - 逐格生成草图。
   - 调整 Prompt 和 Seed 直至满意。
5. **排版**: 拖入气泡，填入台词。
6. **导出**: 生成 PNG 长图或 PDF 册子。

## 5. 差异化优势
- **与小说模块联动**: 实现“文漫一体化”创作流。
- **本地算力支持**: 深度集成 ComfyUI / Stable Diffusion WebUI API，降低云端成本。
