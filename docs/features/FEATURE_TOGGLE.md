# 功能模块开关

## 概述

应用程序现在支持在设置页面中启用或禁用各个功能模块。这允许用户根据自己的需求定制应用程序界面。

## 功能

### 可控制的功能模块

以下功能模块可以在设置页面中启用或禁用：

1. **AI 推理** (`inference`) - 本地模型推理功能
2. **AI 对话** (`chat`) - 与 AI 模型进行对话交流
3. **工作流** (`workflow`) - 创建和管理 AI 推理工作流
4. **小说创作** (`novel`) - AI 辅助小说创作功能
5. **漫画制作** (`comic`) - AI 辅助漫画创作功能
6. **音频工坊** (`audio`) - AI 音频生成和处理功能
7. **视频创作** (`video`) - AI 视频生成和编辑功能
8. **模型管理** (`models`) - 管理本地和远程 AI 模型
9. **历史记录** (`history`) - 查看和管理历史记录

### 使用方法

1. 打开应用程序
2. 点击侧边栏底部的"设置"按钮
3. 滚动到"功能模块设置"卡片
4. 使用开关按钮启用或禁用各个功能模块
5. 设置会自动保存到本地存储
6. 返回主界面，侧边栏将只显示已启用的功能模块

### 技术实现

#### 核心文件

- **`src/lib/features.ts`** - 功能模块状态管理
  - 使用 `@solid-primitives/storage` 的 `makePersisted` 实现持久化
  - 提供 `useFeatures()` hook 用于访问和修改功能状态
  
- **`src/components/SettingsPage.tsx`** - 设置页面
  - 添加了 `FeatureModulesControl` 组件
  - 显示所有功能模块的开关控件
  
- **`src/components/Sidebar.tsx`** - 侧边栏
  - 使用 `useFeatures()` hook 过滤已启用的功能
  - 只显示已启用的功能模块菜单项

#### 国际化支持

功能模块的名称和描述支持多语言：
- 中文简体 (`zh-CN`)
- 英文 (`en-US`)
- 日文 (`ja-JP`)

翻译键位于 `app.settings.features.*`

#### 数据持久化

功能模块的启用状态保存在浏览器的 `localStorage` 中，键名为 `enabledFeatures`。

数据格式：
```json
{
  "inference": true,
  "chat": true,
  "workflow": true,
  "novel": true,
  "comic": true,
  "audio": true,
  "video": true,
  "models": true,
  "history": true
}
```

### API

#### `useFeatures()`

返回一个对象，包含以下属性和方法：

```typescript
{
  // 获取所有功能的启用状态
  enabledFeatures: Accessor<EnabledFeatures>,
  
  // 设置所有功能的启用状态
  setEnabledFeatures: Setter<EnabledFeatures>,
  
  // 检查某个功能是否启用
  isFeatureEnabled: (featureId: FeatureId) => boolean,
  
  // 切换某个功能的启用状态
  toggleFeature: (featureId: FeatureId, enabled: boolean) => void
}
```

#### 类型定义

```typescript
export type FeatureId = 
  | "inference" 
  | "chat" 
  | "workflow" 
  | "novel" 
  | "comic" 
  | "audio" 
  | "video" 
  | "models" 
  | "history";

export type EnabledFeatures = Record<FeatureId, boolean>;
```

### 示例用法

```typescript
import { useFeatures } from "@/lib/features";

function MyComponent() {
  const { isFeatureEnabled, toggleFeature } = useFeatures();
  
  // 检查功能是否启用
  if (isFeatureEnabled("chat")) {
    // 显示聊天功能
  }
  
  // 切换功能状态
  const handleToggle = () => {
    toggleFeature("chat", false);
  };
  
  return <div>...</div>;
}
```

## 未来改进

- [ ] 添加功能模块分组（如"创作工具"、"管理工具"等）
- [ ] 支持功能模块的依赖关系（如某些功能依赖其他功能）
- [ ] 添加功能模块的使用统计
- [ ] 支持导入/导出功能配置
- [ ] 添加预设配置（如"基础版"、"专业版"等）
