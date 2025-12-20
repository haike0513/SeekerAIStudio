/**
 * 工具函数
 */

import { nanoid } from "nanoid";
import type { Message } from "./types";

/**
 * 解析 SSE 流数据
 */
export function parseSSEData(data: string): Record<string, unknown> | null {
  try {
    const lines = data.split("\n");
    const result: Record<string, unknown> = {};

    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;

      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (key === "data" && value) {
        try {
          const parsed = JSON.parse(value);
          return parsed;
        } catch {
          return { text: value };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 解析 AI SDK v6 数据流格式
 * 格式: 0:"text content"
 */
export function parseDataStream(line: string): { type: string; data: unknown } | null {
  try {
    // 数据流格式: <type>:"<json-encoded-data>"
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) return null;

    const type = line.slice(0, colonIndex);
    const dataStr = line.slice(colonIndex + 1);

    // 解析 JSON 编码的数据
    if (dataStr.startsWith('"') && dataStr.endsWith('"')) {
      const decoded = JSON.parse(dataStr);
      return { type, data: decoded };
    }

    // 尝试直接解析为 JSON
    try {
      const parsed = JSON.parse(dataStr);
      return { type, data: parsed };
    } catch {
      return { type, data: dataStr };
    }
  } catch {
    return null;
  }
}

/**
 * 创建消息 ID
 */
export function createMessageId(): string {
  return nanoid();
}

/**
 * 合并消息内容
 */
export function mergeMessageContent(
  current: string | Message["content"],
  delta: string,
): string | Message["content"] {
  if (typeof current === "string") {
    return current + delta;
  }

  // 如果是数组，查找最后一个文本部分
  if (Array.isArray(current)) {
    const lastPart = current[current.length - 1];
    if (lastPart && lastPart.type === "text") {
      return [
        ...current.slice(0, -1),
        {
          ...lastPart,
          text: lastPart.text + delta,
        },
      ];
    } else {
      return [...current, { type: "text" as const, text: delta }];
    }
  }

  return delta;
}

/**
 * 解析响应头中的值
 */
export function getHeaderValue(
  headers: Headers,
  name: string,
): string | null {
  return headers.get(name);
}

/**
 * 获取请求头
 */
export function getHeaders(
  headers?: Record<string, string> | (() => Record<string, string>),
): Record<string, string> {
  if (!headers) return {};
  if (typeof headers === "function") return headers();
  return headers;
}

/**
 * 获取请求体
 */
export function getBody(
  body?: Record<string, unknown> | (() => Record<string, unknown>),
): Record<string, unknown> {
  if (!body) return {};
  if (typeof body === "function") return body();
  return body;
}
