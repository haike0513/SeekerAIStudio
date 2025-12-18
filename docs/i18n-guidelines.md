# 国际化 (i18n) 开发指南

## 核心原则

1. **所有用户可见的文本必须使用国际化**
2. **使用 `createMemo` 确保响应式更新**
3. **避免硬编码任何语言特定的文本**

## 响应式国际化模式

### ✅ 正确：使用 createMemo

```typescript
import { createMemo } from "solid-js";
import { useI18n } from "@/lib/i18n";

export default function MyComponent() {
  const { t } = useI18n();
  
  // ✅ 正确：使用 createMemo 确保响应式
  const items = createMemo(() => [
    { label: t("app.sidebar.inference") },
    { label: t("app.sidebar.workflow") },
  ]);
  
  return <For each={items()}>{(item) => <div>{item.label}</div>}</For>;
}
```

### ❌ 错误：直接使用 t() 在组件顶层

```typescript
// ❌ 错误：不会响应语言变化
const items = [
  { label: t("app.sidebar.inference") },
  { label: t("app.sidebar.workflow") },
];
```

### ✅ 正确：在 JSX 中直接使用

```typescript
// ✅ 正确：在 JSX 中直接使用会自动响应
return (
  <div>
    <h1>{t("app.title")}</h1>
    <p>{t("app.description")}</p>
  </div>
);
```

## 文件结构

国际化文件按语言拆分，组织在 `src/lib/i18n/` 文件夹下：

```
src/lib/i18n/
├── index.ts      # 主入口文件，包含 useI18n hook
├── zh-CN.ts      # 简体中文翻译
├── en-US.ts      # 英文翻译
└── ja-JP.ts      # 日文翻译
```

## 添加新的国际化文本

1. **在对应的语言文件中添加文本**
   - 在 `src/lib/i18n/zh-CN.ts` 中添加中文翻译
   - 在 `src/lib/i18n/en-US.ts` 中添加英文翻译
   - 在 `src/lib/i18n/ja-JP.ts` 中添加日文翻译
   - 使用嵌套对象组织文本，保持所有语言文件的结构一致

2. **使用文本键**
   ```typescript
   // 在组件中
   {t("app.sidebar.settings")}
   ```

3. **文件组织示例**
   ```typescript
   // src/lib/i18n/zh-CN.ts
   export default {
     app: {
       sidebar: {
         settings: "设置",
       },
     },
   };
   ```

## 检查清单

在提交代码前，检查：

- [ ] 所有用户可见的文本都使用了 `t()` 函数
- [ ] 数组/对象定义使用了 `createMemo`（如果包含 `t()` 调用）
- [ ] 没有硬编码的中文、英文或其他语言文本
- [ ] 所有三种语言（zh-CN, en-US, ja-JP）都有对应的翻译
- [ ] 切换语言后，所有文本都能立即更新

## 常见问题

### Q: 为什么我的文本在切换语言后不更新？

A: 可能是因为：
1. 在组件顶层直接使用了 `t()` 而没有使用 `createMemo`
2. 文本是硬编码的，没有使用国际化

### Q: 什么时候需要使用 createMemo？

A: 当你在组件顶层定义包含 `t()` 调用的数组或对象时，必须使用 `createMemo`。在 JSX 中直接使用 `t()` 不需要。

### Q: console.log 中的文本需要国际化吗？

A: 不需要。console.log 是开发者工具，用户看不到。

## 示例

查看以下文件作为参考：
- `src/components/Sidebar.tsx` - 使用 createMemo 的响应式数组
- `src/components/SettingsPage.tsx` - 使用 createMemo 的响应式选项列表
- `src/components/InferencePanel.tsx` - 在 JSX 中直接使用 t()

