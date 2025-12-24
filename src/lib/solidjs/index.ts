/**
 * AI SDK for SolidJS
 * 基于 Vercel AI SDK React 的 API 设计
 * 
 * @module @/lib/ai/solidjs
 */

export { useChat } from "./use-chat";
export { useCompletion } from "./use-completion";
export { useAssistant } from "./use-assistant";
export { useStickToBottom } from "./use-stick-to-bottom";
export type {
	StickToBottomOptions,
	StickToBottomInstance,
	ScrollToBottom,
	StopScroll,
	SpringAnimation,
	Animation,
	GetTargetScrollTop,
	ScrollToBottomOptions,
} from "./use-stick-to-bottom";

export type {
  Message,
  MessageRole,
  MessagePart,
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ChatRequestOptions,
  CompletionRequestOptions,
  AssistantRequestOptions,
  UseChatReturn,
  UseCompletionReturn,
  UseAssistantReturn,
} from "./types";
