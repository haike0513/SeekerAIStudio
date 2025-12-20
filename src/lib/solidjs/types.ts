/**
 * 类型定义 - 基于 Vercel AI SDK React 的 API
 */

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface TextPart {
  type: "text";
  text: string;
}

export interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: unknown;
}

export type MessagePart = TextPart | ToolCallPart | ToolResultPart;

export interface Message {
  id: string;
  role: MessageRole;
  content: string | MessagePart[];
  createdAt?: Date;
}

export interface ChatRequestOptions {
  api?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | (() => Record<string, string>);
  body?: Record<string, unknown> | (() => Record<string, unknown>);
  id?: string;
  initialMessages?: Message[];
  fetch?: typeof fetch;
}

export interface CompletionRequestOptions {
  api?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | (() => Record<string, string>);
  body?: Record<string, unknown> | (() => Record<string, unknown>);
  id?: string;
  initialInput?: string;
  initialCompletion?: string;
  fetch?: typeof fetch;
}

export interface AssistantRequestOptions {
  api: string;
  threadId?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string> | (() => Record<string, string>);
  body?: Record<string, unknown> | (() => Record<string, unknown>);
  fetch?: typeof fetch;
}

import type { Accessor } from "solid-js";

export interface UseChatReturn {
  id: Accessor<string>;
  messages: Accessor<Message[]>;
  input: Accessor<string>;
  setInput: (value: string | ((prev: string) => string)) => void;
  handleInputChange: (e: Event) => void;
  handleSubmit: (e: Event) => Promise<void>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | undefined>;
  stop: () => void;
  reload: () => Promise<void>;
  append: (message: Omit<Message, "id" | "createdAt">) => Promise<void>;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}

export interface UseCompletionReturn {
  id: Accessor<string>;
  completion: Accessor<string>;
  input: Accessor<string>;
  setInput: (value: string | ((prev: string) => string)) => void;
  handleInputChange: (e: Event) => void;
  handleSubmit: (e: Event) => Promise<void>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | undefined>;
  stop: () => void;
  reload: () => Promise<void>;
  complete: (prompt: string) => Promise<void>;
  setCompletion: (completion: string | ((prev: string) => string)) => void;
}

export interface UseAssistantReturn {
  threadId: Accessor<string | undefined>;
  messages: Accessor<Message[]>;
  input: Accessor<string>;
  setInput: (value: string | ((prev: string) => string)) => void;
  handleInputChange: (e: Event) => void;
  handleSubmit: (e: Event) => Promise<void>;
  isLoading: Accessor<boolean>;
  error: Accessor<Error | undefined>;
  stop: () => void;
  append: (message: Omit<Message, "id" | "createdAt">) => Promise<void>;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
}
