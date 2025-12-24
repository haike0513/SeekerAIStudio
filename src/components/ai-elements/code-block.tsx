/**
 * CodeBlock 组件（SolidJS 版本）
 * 用于显示代码块，支持语法高亮
 * 
 * 注意：这是一个简化版本，使用简单的代码块显示
 * 如果需要完整的语法高亮，需要安装 shiki 库
 */

import { type Component, type JSX, createContext, useContext, createSignal, Show, For, splitProps } from "solid-js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-solid";

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

export type CodeBlockProps = JSX.HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
};

export const CodeBlock: Component<CodeBlockProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "code", "language", "showLineNumbers", "children"]);
  
  return (
    <CodeBlockContext.Provider value={{ code: props.code }}>
      <div
        class={cn(
          "group relative w-full overflow-hidden rounded-md border bg-background text-foreground",
          props.class
        )}
        {...rest}
      >
        <div class="relative">
          <pre class="overflow-auto m-0 bg-background p-4 text-foreground text-sm">
            <code class="font-mono text-sm whitespace-pre">
              <Show
                when={props.showLineNumbers}
                fallback={props.code}
              >
                <For each={props.code.split("\n")}>
                  {(line, index) => (
                    <div class="flex">
                      <span class="inline-block min-w-10 mr-4 text-right select-none text-muted-foreground">
                        {index() + 1}
                      </span>
                      <span>{line}</span>
                    </div>
                  )}
                </For>
              </Show>
            </code>
          </pre>
          <Show when={props.children}>
            <div class="absolute top-2 right-2 flex items-center gap-2">
              {props.children}
            </div>
          </Show>
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton: Component<CodeBlockCopyButtonProps> = (props) => {
  const [isCopied, setIsCopied] = createSignal(false);
  const { code } = useContext(CodeBlockContext);
  
  const timeout = props.timeout ?? 2000;
  const [, rest] = splitProps(props, ["onCopy", "onError", "timeout", "children", "class"]);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      props.onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      props.onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      props.onError?.(error as Error);
    }
  };

  return (
    <Button
      class={cn("shrink-0", props.class)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...rest}
    >
      {props.children ?? (isCopied() ? <Check size={14} /> : <Copy size={14} />)}
    </Button>
  );
};

