/**
 * Chat Store - 聊天状态管理
 * 
 * 负责管理聊天会话和消息的持久化存储
 */

import { createStore } from "solid-js/store";
import { makePersisted } from "@solid-primitives/storage";
import { nanoid } from "nanoid";

// ============ 类型定义 ============

export interface ChatMessage {
    id: string;
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: number;
    tokens?: number;
    status?: "pending" | "streaming" | "complete" | "error";
    metadata?: {
        model?: string;
        provider?: string;
        finishReason?: string;
    };
}

export interface ChatSession {
    id: string;
    title: string;
    modelId: string;
    systemPrompt?: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
    lastMessage?: string;
}

export interface ChatState {
    sessions: ChatSession[];
    messages: Record<string, ChatMessage[]>; // sessionId -> messages
    activeSessionId: string | null;
    isLoading: boolean;
}

// ============ 初始状态 ============

const initialState: ChatState = {
    sessions: [],
    messages: {},
    activeSessionId: null,
    isLoading: false,
};

// ============ Store 创建 ============

const [state, setState] = makePersisted(
    createStore<ChatState>(initialState),
    {
        name: "seeker_chat_store",
        // 自定义序列化以处理嵌套对象
        serialize: (value) => JSON.stringify(value),
        deserialize: (value) => JSON.parse(value),
    }
);

// ============ Actions ============

/**
 * 创建新会话
 */
export function createSession(options?: {
    title?: string;
    modelId?: string;
    systemPrompt?: string;
}): string {
    const id = nanoid();
    const now = Date.now();

    const session: ChatSession = {
        id,
        title: options?.title || "新对话",
        modelId: options?.modelId || "openai:gpt-4o",
        systemPrompt: options?.systemPrompt,
        createdAt: now,
        updatedAt: now,
        messageCount: 0,
    };

    setState("sessions", (sessions) => [session, ...sessions]);
    setState("messages", id, []);
    setState("activeSessionId", id);

    return id;
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): void {
    setState("sessions", (sessions) =>
        sessions.filter((s) => s.id !== sessionId)
    );

    // 删除关联的消息
    setState("messages", (messages) => {
        const newMessages = { ...messages };
        delete newMessages[sessionId];
        return newMessages;
    });

    // 如果删除的是当前活动会话，切换到另一个
    if (state.activeSessionId === sessionId) {
        const remaining = state.sessions.filter((s) => s.id !== sessionId);
        setState("activeSessionId", remaining.length > 0 ? remaining[0].id : null);
    }
}

/**
 * 更新会话
 */
export function updateSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, "title" | "modelId" | "systemPrompt">>
): void {
    setState("sessions", (s) => s.id === sessionId, (session) => ({
        ...session,
        ...updates,
        updatedAt: Date.now(),
    }));
}

/**
 * 设置当前活动会话
 */
export function setActiveSession(sessionId: string | null): void {
    setState("activeSessionId", sessionId);
}

/**
 * 添加消息
 */
export function addMessage(
    sessionId: string,
    message: Omit<ChatMessage, "id" | "sessionId" | "createdAt">
): string {
    const id = nanoid();
    const now = Date.now();

    const newMessage: ChatMessage = {
        ...message,
        id,
        sessionId,
        createdAt: now,
        status: message.status || "complete",
    };

    // 添加消息
    setState("messages", sessionId, (messages = []) => [...messages, newMessage]);

    // 更新会话信息
    setState("sessions", (s) => s.id === sessionId, (session) => ({
        ...session,
        updatedAt: now,
        messageCount: (session.messageCount || 0) + 1,
        lastMessage: message.content.slice(0, 100),
    }));

    return id;
}

/**
 * 更新消息
 */
export function updateMessage(
    sessionId: string,
    messageId: string,
    updates: Partial<Pick<ChatMessage, "content" | "status" | "tokens" | "metadata">>
): void {
    setState("messages", sessionId, (m) => m.id === messageId, (message) => ({
        ...message,
        ...updates,
    }));
}

/**
 * 删除消息
 */
export function deleteMessage(sessionId: string, messageId: string): void {
    setState("messages", sessionId, (messages) =>
        messages.filter((m) => m.id !== messageId)
    );

    // 更新消息计数
    setState("sessions", (s) => s.id === sessionId, (session) => ({
        ...session,
        messageCount: Math.max(0, (session.messageCount || 0) - 1),
    }));
}

/**
 * 清空会话消息
 */
export function clearSessionMessages(sessionId: string): void {
    setState("messages", sessionId, []);
    setState("sessions", (s) => s.id === sessionId, (session) => ({
        ...session,
        messageCount: 0,
        lastMessage: undefined,
        updatedAt: Date.now(),
    }));
}

/**
 * 获取会话的消息
 */
export function getSessionMessages(sessionId: string): ChatMessage[] {
    return state.messages[sessionId] || [];
}

/**
 * 获取会话
 */
export function getSession(sessionId: string): ChatSession | undefined {
    return state.sessions.find((s) => s.id === sessionId);
}

/**
 * 自动生成会话标题
 */
export function autoGenerateTitle(sessionId: string): void {
    const messages = state.messages[sessionId];
    if (!messages || messages.length === 0) return;

    // 使用第一条用户消息作为标题
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
        const title = firstUserMessage.content.slice(0, 50) +
            (firstUserMessage.content.length > 50 ? "..." : "");
        updateSession(sessionId, { title });
    }
}

/**
 * 设置加载状态
 */
export function setLoading(loading: boolean): void {
    setState("isLoading", loading);
}

// ============ Selectors ============

/**
 * 获取排序后的会话列表 (按更新时间倒序)
 */
export function getSortedSessions(): ChatSession[] {
    return [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * 获取当前活动会话
 */
export function getActiveSession(): ChatSession | undefined {
    if (!state.activeSessionId) return undefined;
    return state.sessions.find((s) => s.id === state.activeSessionId);
}

/**
 * 获取当前活动会话的消息
 */
export function getActiveSessionMessages(): ChatMessage[] {
    if (!state.activeSessionId) return [];
    return state.messages[state.activeSessionId] || [];
}

// ============ 导出 ============

export const chatStore = {
    // State (只读)
    get state() {
        return state;
    },

    // Getters
    getSortedSessions,
    getActiveSession,
    getActiveSessionMessages,
    getSession,
    getSessionMessages,

    // Actions
    createSession,
    deleteSession,
    updateSession,
    setActiveSession,
    addMessage,
    updateMessage,
    deleteMessage,
    clearSessionMessages,
    autoGenerateTitle,
    setLoading,
};

export default chatStore;
