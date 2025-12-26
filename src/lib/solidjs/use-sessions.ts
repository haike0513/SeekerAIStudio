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
  // 角色 ID（可选）
  roleId?: string;
}

const STORAGE_KEY_SESSIONS = "chat_sessions";
const STORAGE_KEY_CURRENT_SESSION = "current_session_id";

/**
 * Session存储管理
 */
class SessionStorage {
  private sessionsKey = STORAGE_KEY_SESSIONS;
  private currentSessionKey = STORAGE_KEY_CURRENT_SESSION;
  // 限制每个会话存储的最大消息数量（不包括系统消息）
  private readonly MAX_MESSAGES_PER_SESSION = 100;
  // 限制最大会话数量
  private readonly MAX_SESSIONS = 50;

  // 检查 localStorage 是否可用
  private isStorageAvailable(): boolean {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  // 处理存储错误
  private handleStorageError(error: unknown, operation: string): void {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.warn(`存储配额已满，尝试清理旧数据: ${operation}`);
      // 尝试清理旧会话
      this.cleanupOldSessions();
    } else {
      console.error(`存储操作失败 (${operation}):`, error);
    }
  }

  // 清理旧会话（保留最近的 N 个会话）
  cleanupOldSessions(): void {
    try {
      const sessions = this.getSessions();
      if (sessions.length <= this.MAX_SESSIONS) {
        return;
      }

      // 按更新时间排序，保留最新的会话
      const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
      const toKeep = sorted.slice(0, this.MAX_SESSIONS);
      const toRemove = sorted.slice(this.MAX_SESSIONS);

      // 删除旧会话的消息
      for (const session of toRemove) {
        try {
          const key = `chat_session_messages_${session.id}`;
          localStorage.removeItem(key);
        } catch (e) {
          // 忽略删除错误
        }
      }

      // 保存清理后的会话列表
      this.saveSessions(toKeep);
      console.log(`已清理 ${toRemove.length} 个旧会话`);
    } catch (error) {
      console.error("清理旧会话失败:", error);
    }
  }

  // 限制消息数量（保留最近的 N 条消息，但保留系统消息）
  private limitMessages(messages: UIMessage[]): UIMessage[] {
    if (messages.length <= this.MAX_MESSAGES_PER_SESSION) {
      return messages;
    }

    // 分离系统消息和其他消息
    const systemMessages = messages.filter((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");

    // 保留最近的 N 条其他消息
    const recentMessages = otherMessages.slice(-this.MAX_MESSAGES_PER_SESSION);

    // 合并：系统消息在前，然后是最近的消息
    return [...systemMessages, ...recentMessages];
  }

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
    if (!this.isStorageAvailable()) {
      console.warn("localStorage 不可用，无法保存会话");
      return;
    }

    try {
      // 限制会话数量
      const sessionsToSave = sessions.slice(0, this.MAX_SESSIONS);
      localStorage.setItem(this.sessionsKey, JSON.stringify(sessionsToSave));
    } catch (error) {
      this.handleStorageError(error, "saveSessions");
      // 如果仍然失败，尝试清理后重试
      try {
        this.cleanupOldSessions();
        const sessionsToSave = sessions.slice(0, this.MAX_SESSIONS);
        localStorage.setItem(this.sessionsKey, JSON.stringify(sessionsToSave));
      } catch (retryError) {
        console.error("重试保存会话失败:", retryError);
      }
    }
  }

  // 获取当前session ID
  getCurrentSessionId(): string | null {
    try {
      return localStorage.getItem(this.currentSessionKey);
    } catch (error) {
      console.error("读取当前session ID失败:", error);
      return null;
    }
  }

  // 设置当前session ID
  setCurrentSessionId(sessionId: string | null): void {
    if (!this.isStorageAvailable()) {
      return;
    }

    try {
      if (sessionId) {
        localStorage.setItem(this.currentSessionKey, sessionId);
      } else {
        localStorage.removeItem(this.currentSessionKey);
      }
    } catch (error) {
      this.handleStorageError(error, "setCurrentSessionId");
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
    if (!this.isStorageAvailable()) {
      console.warn("localStorage 不可用，无法保存消息");
      return;
    }

    try {
      const key = `chat_session_messages_${sessionId}`;
      // 限制消息数量
      const limitedMessages = this.limitMessages(messages);
      localStorage.setItem(key, JSON.stringify(limitedMessages));
    } catch (error) {
      this.handleStorageError(error, `saveSessionMessages(${sessionId})`);
      // 如果仍然失败，尝试清理旧会话后重试
      try {
        this.cleanupOldSessions();
        const limitedMessages = this.limitMessages(messages);
        const key = `chat_session_messages_${sessionId}`;
        localStorage.setItem(key, JSON.stringify(limitedMessages));
      } catch (retryError) {
        console.error(`重试保存消息失败 (${sessionId}):`, retryError);
        // 如果还是失败，尝试只保存最近的消息
        try {
          const limitedMessages = this.limitMessages(messages);
          // 进一步限制到 50 条
          const veryLimited = limitedMessages.slice(-50);
          const key = `chat_session_messages_${sessionId}`;
          localStorage.setItem(key, JSON.stringify(veryLimited));
          console.warn(`已限制消息数量到 50 条`);
        } catch (finalError) {
          console.error(`最终保存失败 (${sessionId}):`, finalError);
        }
      }
    }
  }

  // 删除session及其消息
  deleteSession(sessionId: string): void {
    // 删除消息存储
    try {
      const key = `chat_session_messages_${sessionId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`删除session ${sessionId} 消息失败:`, error);
    }

    // 从sessions列表中移除
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    this.saveSessions(filtered);

    // 如果删除的是当前session，清除当前session ID
    if (this.getCurrentSessionId() === sessionId) {
      this.setCurrentSessionId(null);
    }
  }

  // 清理所有会话（用于紧急情况）
  clearAllSessions(): void {
    try {
      // 获取所有会话
      const sessions = this.getSessions();
      
      // 删除所有会话的消息
      for (const session of sessions) {
        try {
          const key = `chat_session_messages_${session.id}`;
          localStorage.removeItem(key);
        } catch (e) {
          // 忽略单个删除错误
        }
      }

      // 清空会话列表
      localStorage.removeItem(this.sessionsKey);
      localStorage.removeItem(this.currentSessionKey);
      console.log("已清理所有会话数据");
    } catch (error) {
      console.error("清理所有会话失败:", error);
    }
  }

  // 获取存储使用情况（估算）
  getStorageUsage(): { sessions: number; estimatedSize: number } {
    try {
      const sessions = this.getSessions();
      let estimatedSize = 0;

      // 估算会话列表大小
      const sessionsData = localStorage.getItem(this.sessionsKey);
      if (sessionsData) {
        estimatedSize += new Blob([sessionsData]).size;
      }

      // 估算所有消息的大小
      for (const session of sessions) {
        try {
          const key = `chat_session_messages_${session.id}`;
          const messagesData = localStorage.getItem(key);
          if (messagesData) {
            estimatedSize += new Blob([messagesData]).size;
          }
        } catch (e) {
          // 忽略单个会话的错误
        }
      }

      return {
        sessions: sessions.length,
        estimatedSize,
      };
    } catch (error) {
      console.error("获取存储使用情况失败:", error);
      return { sessions: 0, estimatedSize: 0 };
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
  const createSession = (modelId: string, roleId?: string): string => {
    // 在创建新会话前，先尝试清理旧会话（如果会话数量过多）
    const currentSessions = sessions();
    if (currentSessions.length >= 50) {
      storage.cleanupOldSessions();
      // 重新加载清理后的会话列表
      const cleaned = storage.getSessions();
      if (cleaned.length < currentSessions.length) {
        setSessions(cleaned);
      }
    }

    const sessionId = generateSessionId();
    const now = Date.now();
    const newSession: ChatSession = {
      id: sessionId,
      title: "新对话",
      createdAt: now,
      updatedAt: now,
      modelId,
      messageCount: 0,
      roleId,
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      try {
        storage.saveSessions(updated);
      } catch (error) {
        // 如果保存失败，尝试清理后重试
        console.warn("创建会话时保存失败，尝试清理后重试:", error);
        storage.cleanupOldSessions();
        try {
          storage.saveSessions(updated);
        } catch (retryError) {
          console.error("重试保存会话失败:", retryError);
        }
      }
      return updated;
    });
    
    try {
      setCurrentSessionIdInternal(sessionId);
      storage.setCurrentSessionId(sessionId);
    } catch (error) {
      console.warn("设置当前会话 ID 失败:", error);
    }
    
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
    updates: Partial<Pick<ChatSession, "title" | "messageCount" | "preview" | "modelId" | "roleId">>
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

  // 清理所有会话（紧急情况使用）
  const clearAllSessions = (): void => {
    storage.clearAllSessions();
    setSessions([]);
    setCurrentSessionIdInternal(null);
  };

  // 获取存储使用情况
  const getStorageUsage = () => {
    return storage.getStorageUsage();
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
    clearAllSessions,
    getStorageUsage,
  };
}

