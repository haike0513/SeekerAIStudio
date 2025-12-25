/**
 * Session管理Hook
 * 用于管理AI对话会话的历史记录
 */

import { createSignal, createMemo, onMount } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import type { UIMessage } from "ai";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  modelId: string;
  messageCount: number;
  // 存储第一条用户消息的预览（用于显示在历史列表中）
  preview?: string;
}

const STORAGE_KEY_SESSIONS = "chat_sessions";
const STORAGE_KEY_CURRENT_SESSION = "current_session_id";

/**
 * Session存储管理
 */
class SessionStorage {
  private sessionsKey = STORAGE_KEY_SESSIONS;
  private currentSessionKey = STORAGE_KEY_CURRENT_SESSION;

  // 获取所有sessions
  getSessions(): ChatSession[] {
    try {
      const data = localStorage.getItem(this.sessionsKey);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error("读取sessions失败:", error);
      return [];
    }
  }

  // 保存所有sessions
  saveSessions(sessions: ChatSession[]): void {
    try {
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessions));
    } catch (error) {
      console.error("保存sessions失败:", error);
    }
  }

  // 获取当前session ID
  getCurrentSessionId(): string | null {
    return localStorage.getItem(this.currentSessionKey);
  }

  // 设置当前session ID
  setCurrentSessionId(sessionId: string | null): void {
    if (sessionId) {
      localStorage.setItem(this.currentSessionKey, sessionId);
    } else {
      localStorage.removeItem(this.currentSessionKey);
    }
  }

  // 获取单个session的消息（存储在单独的key中）
  getSessionMessages(sessionId: string): UIMessage[] {
    try {
      const key = `chat_session_messages_${sessionId}`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error(`读取session ${sessionId} 消息失败:`, error);
      return [];
    }
  }

  // 保存单个session的消息
  saveSessionMessages(sessionId: string, messages: UIMessage[]): void {
    try {
      const key = `chat_session_messages_${sessionId}`;
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error(`保存session ${sessionId} 消息失败:`, error);
    }
  }

  // 删除session及其消息
  deleteSession(sessionId: string): void {
    // 从sessions列表中移除
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    this.saveSessions(filtered);

    // 删除消息存储
    try {
      const key = `chat_session_messages_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`删除session ${sessionId} 消息失败:`, error);
    }

    // 如果删除的是当前session，清除当前session ID
    if (this.getCurrentSessionId() === sessionId) {
      this.setCurrentSessionId(null);
    }
  }
}

const storage = new SessionStorage();

/**
 * 生成新的session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 从消息生成session标题
 */
function generateSessionTitle(messages: UIMessage[]): string {
  // 查找第一条用户消息
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const textParts = firstUserMessage.parts?.filter(
      (p) => p && p.type === "text" && typeof p.text === "string"
    ) || [];
    const text = textParts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (text.trim()) {
      // 取前30个字符作为标题
      return text.trim().substring(0, 30) + (text.length > 30 ? "..." : "");
    }
  }
  return "新对话";
}

/**
 * 从消息提取预览文本
 */
function extractPreview(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const textParts = firstUserMessage.parts?.filter(
      (p) => p && p.type === "text" && typeof p.text === "string"
    ) || [];
    const text = textParts.map((p) => (p.type === "text" ? p.text : "")).join("");
    if (text.trim()) {
      return text.trim().substring(0, 100) + (text.length > 100 ? "..." : "");
    }
  }
  return "";
}

export function useSessions() {
  // 使用persisted signal来持久化sessions列表
  const [sessions, setSessions] = makePersisted(
    createSignal<ChatSession[]>([]),
    { name: STORAGE_KEY_SESSIONS }
  );

  // 当前选中的session ID
  const [currentSessionId, setCurrentSessionIdInternal] = makePersisted(
    createSignal<string | null>(null),
    { name: STORAGE_KEY_CURRENT_SESSION }
  );

  // 初始化时从localStorage加载
  onMount(() => {
    const stored = storage.getSessions();
    if (stored.length > 0) {
      setSessions(stored);
    }
    const currentId = storage.getCurrentSessionId();
    if (currentId) {
      setCurrentSessionIdInternal(currentId);
    }
  });

  // 当前session
  const currentSession = createMemo(() => {
    const id = currentSessionId();
    if (!id) return null;
    return sessions().find((s) => s.id === id) || null;
  });

  // 创建新session
  const createSession = (modelId: string): string => {
    const sessionId = generateSessionId();
    const now = Date.now();
    const newSession: ChatSession = {
      id: sessionId,
      title: "新对话",
      createdAt: now,
      updatedAt: now,
      modelId,
      messageCount: 0,
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      storage.saveSessions(updated);
      return updated;
    });
    setCurrentSessionIdInternal(sessionId);
    storage.setCurrentSessionId(sessionId);
    return sessionId;
  };

  // 切换到指定session
  const switchToSession = (sessionId: string): void => {
    const session = sessions().find((s) => s.id === sessionId);
    if (session) {
      setCurrentSessionIdInternal(sessionId);
      storage.setCurrentSessionId(sessionId);
    }
  };

  // 更新session信息（标题、消息数等）
  const updateSession = (
    sessionId: string,
    updates: Partial<Pick<ChatSession, "title" | "messageCount" | "preview" | "modelId">>
  ): void => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            ...updates,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
    storage.saveSessions(sessions());
  };

  // 保存session的消息
  const saveSessionMessages = (sessionId: string, messages: UIMessage[]): void => {
    storage.saveSessionMessages(sessionId, messages);

    // 更新session信息
    const title = generateSessionTitle(messages);
    const preview = extractPreview(messages);
    updateSession(sessionId, {
      title,
      messageCount: messages.length,
      preview,
    });
  };

  // 加载session的消息
  const loadSessionMessages = (sessionId: string): UIMessage[] => {
    return storage.getSessionMessages(sessionId);
  };

  // 删除session
  const deleteSession = (sessionId: string): void => {
    storage.deleteSession(sessionId);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    // 如果删除的是当前session，切换到第一个session或创建新的
    if (currentSessionId() === sessionId) {
      const remaining = sessions().filter((s) => s.id !== sessionId);
      if (remaining.length > 0) {
        switchToSession(remaining[0].id);
      } else {
        setCurrentSessionIdInternal(null);
      }
    }
  };

  // 设置当前session ID（内部使用，也会更新storage）
  const setCurrentSessionId = (sessionId: string | null): void => {
    setCurrentSessionIdInternal(sessionId);
    storage.setCurrentSessionId(sessionId);
  };

  return {
    sessions,
    currentSessionId,
    currentSession,
    createSession,
    switchToSession,
    updateSession,
    saveSessionMessages,
    loadSessionMessages,
    deleteSession,
    setCurrentSessionId,
  };
}

