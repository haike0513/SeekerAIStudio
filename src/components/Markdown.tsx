/**
 * Markdown 渲染组件
 * 用于渲染 markdown 格式的文本内容
 */

import { type Component, createMemo } from "solid-js";
import { marked } from "marked";
import { cn } from "@/lib/utils";

export interface MarkdownProps {
  content: string;
  class?: string;
}

// 配置 marked 选项
marked.setOptions({
  breaks: true, // 支持换行
  gfm: true, // GitHub Flavored Markdown
});

export const Markdown: Component<MarkdownProps> = (props) => {
  // 将 markdown 转换为 HTML
  const htmlContent = createMemo(() => {
    try {
      return marked.parse(props.content) as string;
    } catch (error) {
      console.error("Markdown parsing error:", error);
      return props.content;
    }
  });

  return (
    <div
      class={cn(
        "markdown-content",
        // 基础样式
        "text-sm leading-relaxed break-words",
        // 标题样式
        "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:text-foreground",
        "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-3 [&_h2]:text-foreground",
        "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-foreground",
        "[&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-3 [&_h4]:mb-2 [&_h4]:text-foreground",
        // 段落样式
        "[&_p]:my-2 [&_p]:text-foreground [&_p]:leading-relaxed",
        // 链接样式
        "[&_a]:text-primary [&_a]:underline [&_a]:hover:text-primary/80",
        // 强调样式
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        // 代码样式
        "[&_code]:bg-muted [&_code]:text-foreground [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
        "[&_pre]:bg-muted [&_pre]:border [&_pre]:border-border [&_pre]:rounded-md [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:rounded-none",
        // 列表样式
        "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:my-2",
        "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:my-2",
        "[&_li]:my-1 [&_li]:text-foreground",
        // 引用样式
        "[&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-muted/50 [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:my-4 [&_blockquote]:italic",
        // 水平线样式
        "[&_hr]:my-4 [&_hr]:border-border",
        // 表格样式
        "[&_table]:w-full [&_table]:border-collapse [&_table]:my-4",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold",
        "[&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2",
        props.class
      )}
      innerHTML={htmlContent()}
    />
  );
};

