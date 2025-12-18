# Shadcn-Solid 组件库使用指南

## 已安装的库

### SolidJS 生态常用库
- `solid-icons` - SolidJS 图标库
- `@solid-primitives/scroll` - 滚动相关原语
- `@solid-primitives/mouse` - 鼠标事件原语
- `@solid-primitives/keyboard` - 键盘事件原语
- `@solid-primitives/intersection-observer` - 交叉观察器原语
- `@solid-primitives/resize-observer` - 尺寸观察器原语

### Shadcn-Solid 相关依赖
- `class-variance-authority` - 用于组件变体管理
- `clsx` - 类名工具
- `tailwind-merge` - Tailwind CSS 类名合并
- `lucide-solid` - 图标库（SolidJS 版本）

## 已创建的组件

### 基础组件
- `Button` - 按钮组件 (`src/components/ui/button.tsx`)
- `Input` - 输入框组件 (`src/components/ui/input.tsx`)
- `Card` - 卡片组件 (`src/components/ui/card.tsx`)

## 使用方法

### 导入组件
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
```

### 使用示例
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function MyComponent() {
  return (
    <div>
      <Button variant="default" size="default">点击我</Button>
      <Input type="text" placeholder="输入内容" />
    </div>
  );
}
```

### Button 变体
- `default` - 默认样式
- `destructive` - 危险操作
- `outline` - 轮廓样式
- `secondary` - 次要样式
- `ghost` - 幽灵样式
- `link` - 链接样式

### Button 尺寸
- `default` - 默认尺寸
- `sm` - 小尺寸
- `lg` - 大尺寸
- `icon` - 图标按钮

## 添加更多组件

你可以从 [shadcn-solid 文档](https://zh.shadcn-solid.com/) 复制更多组件到 `src/components/ui/` 目录。

## 路径别名

项目已配置路径别名 `@` 指向 `src` 目录，可以在导入时使用：
```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
```

