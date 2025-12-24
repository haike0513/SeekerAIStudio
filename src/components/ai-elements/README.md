# AI Elements - SolidJS 版本

基于 Vercel AI Elements React 版本转换的 SolidJS 组件库。

## 组件列表

### Chat 组件
完整的聊天界面组件，整合了消息列表和输入框。

```tsx
import { Chat } from "@/components/ai-elements";
import { useChat } from "@/lib/solidjs/use-chat";

function MyChatPage() {
  const chat = useChat({
    // useChat 配置
  });

  return <Chat chat={chat} />;
}
```

### Message 组件
用于渲染单条消息及其相关功能。

```tsx
import { Message, MessageContent, MessageActions } from "@/components/ai-elements";

<Message from="user">
  <MessageContent>
    <p>这是一条用户消息</p>
  </MessageContent>
  <MessageActions>
    {/* 操作按钮 */}
  </MessageActions>
</Message>
```

### PromptInput 组件
聊天输入框组件，支持文本输入和文件附件。

```tsx
import { PromptInput, PromptInputProvider } from "@/components/ai-elements";

<PromptInputProvider>
  <PromptInput
    status="ready"
    onSubmit={(e) => {
      // 处理提交
    }}
  />
</PromptInputProvider>
```

## 使用示例

### 基础聊天界面

```tsx
import { Chat } from "@/components/ai-elements";
import { useChat } from "@/lib/solidjs/use-chat";

export default function ChatPage() {
  const chat = useChat({
    // 配置选项
  });

  return (
    <div class="h-screen">
      <Chat chat={chat} />
    </div>
  );
}
```

### 自定义消息渲染

```tsx
import { Chat } from "@/components/ai-elements";
import { Message, MessageContent } from "@/components/ai-elements";

<Chat
  chat={chat}
  renderMessage={(message, index) => (
    <Message from={message.role}>
      <MessageContent>
        {/* 自定义渲染逻辑 */}
      </MessageContent>
    </Message>
  )}
/>
```

### 使用 PromptInput 独立组件

```tsx
import { PromptInput, PromptInputProvider } from "@/components/ai-elements";
import { createSignal } from "solid-js";

function MyInput() {
  const [value, setValue] = createSignal("");

  return (
    <PromptInputProvider>
      <PromptInput
        onInputChange={setValue}
        onSubmit={(e) => {
          console.log("提交:", value());
        }}
      />
    </PromptInputProvider>
  );
}
```

## 组件 API

### Chat

| 属性 | 类型 | 说明 |
|------|------|------|
| `chat` | `UseChatHelpers<UIMessage>` | useChat hook 的返回值（可选） |
| `chatOptions` | `UseChatOptions` | useChat 配置选项（可选） |
| `renderMessage` | `(message: UIMessage, index: number) => JSX.Element` | 自定义消息渲染函数（可选） |
| `emptyState` | `JSX.Element` | 空状态显示（可选） |

### Message

| 属性 | 类型 | 说明 |
|------|------|------|
| `from` | `"user" \| "assistant" \| "system"` | 消息发送者角色 |

### PromptInput

| 属性 | 类型 | 说明 |
|------|------|------|
| `status` | `ChatStatus` | 聊天状态（可选） |
| `onSubmit` | `(e: Event) => void` | 提交处理函数（可选） |
| `onInputChange` | `(value: string) => void` | 输入变化处理函数（可选） |

## 注意事项

1. **SolidJS 特性**：所有组件使用 `class` 而不是 `className`
2. **响应式**：组件内部使用 SolidJS 的响应式 API（`createSignal`、`createMemo` 等）
3. **类型安全**：所有组件都有完整的 TypeScript 类型定义
4. **样式**：使用 Tailwind CSS 和 shadcn/ui 组件库

## 与 React 版本的差异

1. **状态管理**：使用 `createSignal` 替代 `useState`
2. **生命周期**：使用 `onCleanup` 替代 `useEffect` 的清理函数
3. **Context**：使用 SolidJS 的 `createContext` API
4. **条件渲染**：使用 `<Show>` 组件替代条件表达式
5. **列表渲染**：使用 `<For>` 组件替代 `map`

## 扩展组件

如果需要更多功能，可以参考 Vercel AI Elements 的 React 版本实现：

- `tool.tsx` - 工具调用组件
- `code-block.tsx` - 代码块组件
- `artifact.tsx` - 工件组件
- 等等...

这些组件可以根据需要逐步实现。

