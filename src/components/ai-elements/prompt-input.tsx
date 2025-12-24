/**
 * PromptInput 组件（SolidJS 版本）
 * 基于 Vercel AI Elements React 版本转换
 * 
 * 注意：这是一个简化版本，包含核心功能
 */

import { 
  type Component, 
  type JSX, 
  createContext, 
  useContext, 
  createSignal, 
  onCleanup,
  splitProps,
  Show,
  For,
  type Accessor
} from "solid-js";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ChatStatus, FileUIPart } from "ai";
import { CornerDownLeft, Loader2, Square, X, Paperclip, Image as ImageIcon } from "lucide-solid";
import { nanoid } from "nanoid";

// ============================================================================
// Context & Types
// ============================================================================

export type AttachmentsContext = {
  files: Accessor<(FileUIPart & { id: string })[]>;
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
};

export type TextInputContext = {
  value: Accessor<string>;
  setInput: (v: string) => void;
  clear: () => void;
};

export type PromptInputControllerProps = {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
};

const PromptInputController = createContext<PromptInputControllerProps | null>(null);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController()."
    );
  }
  return ctx;
};

const useOptionalPromptInputController = () => useContext(PromptInputController);

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use useProviderAttachments()."
    );
  }
  return ctx;
};

const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext);

export type PromptInputProviderProps = {
  initialInput?: string;
  children: JSX.Element;
};

/**
 * Optional global provider that lifts PromptInput state outside of PromptInput.
 * If you don't use it, PromptInput stays fully self-managed.
 */
export function PromptInputProvider(props: PromptInputProviderProps) {
  const [textInput, setTextInput] = createSignal(props.initialInput || "");
  const clearInput = () => setTextInput("");

  const [attachmentFiles, setAttachmentFiles] = createSignal<(FileUIPart & { id: string })[]>([]);
  let fileInputRef: HTMLInputElement | null = null;
  let openFileDialogFn: (() => void) | null = null;

  const add = (files: File[] | FileList) => {
    const incoming = Array.from(files);
    if (incoming.length === 0) {
      return;
    }

    setAttachmentFiles((prev) =>
      prev.concat(
        incoming.map((file) => ({
          id: nanoid(),
          type: "file" as const,
          url: URL.createObjectURL(file),
          mediaType: file.type,
          filename: file.name,
        }))
      )
    );
  };

  const remove = (id: string) => {
    setAttachmentFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const clear = () => {
    setAttachmentFiles((prev) => {
      for (const f of prev) {
        if (f.url) {
          URL.revokeObjectURL(f.url);
        }
      }
      return [];
    });
  };

  // Cleanup blob URLs on unmount
  onCleanup(() => {
    const files = attachmentFiles();
    for (const f of files) {
      if (f.url) {
        URL.revokeObjectURL(f.url);
      }
    }
  });

  const openFileDialog = () => {
    openFileDialogFn?.();
  };

  const attachments: AttachmentsContext = {
    files: attachmentFiles,
    add,
    remove,
    clear,
    openFileDialog,
  };

  const controller: PromptInputControllerProps = {
    textInput: {
      value: textInput,
      setInput: setTextInput,
      clear: clearInput,
    },
    attachments,
  };

  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>
        {props.children}
      </ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
}

// ============================================================================
// Component Context & Hooks
// ============================================================================

const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = provider ?? local;
  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput or PromptInputProvider"
    );
  }
  return context;
};

export type PromptInputAttachmentProps = JSX.HTMLAttributes<HTMLDivElement> & {
  data: FileUIPart & { id: string };
};

export const PromptInputAttachment: Component<PromptInputAttachmentProps> = (props) => {
  const attachments = usePromptInputAttachments();
  const filename = props.data.filename || "";
  const mediaType =
    props.data.mediaType?.startsWith("image/") && props.data.url ? "image" : "file";
  const isImage = mediaType === "image";
  const attachmentLabel = filename || (isImage ? "Image" : "Attachment");

  const [, rest] = splitProps(props, ["class", "data"]);

  return (
    <div
      class={cn(
        "group relative size-24 overflow-hidden rounded-lg",
        props.class
      )}
      {...rest}
    >
      <Show
        when={isImage}
        fallback={
          <div class="flex size-full shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Paperclip size={16} />
          </div>
        }
      >
        <img
          alt={filename || "attachment"}
          class="size-full object-cover"
          height={100}
          src={props.data.url}
          width={100}
        />
      </Show>
      <Button
        aria-label="Remove attachment"
        class="absolute top-2 right-2 size-6 rounded-full bg-background/80 p-0 opacity-0 backdrop-blur-sm transition-opacity hover:bg-background group-hover:opacity-100 [&>svg]:size-3"
        onClick={(e) => {
          e.stopPropagation();
          attachments.remove(props.data.id);
        }}
        type="button"
        variant="ghost"
      >
        <X size={12} />
        <span class="sr-only">Remove</span>
      </Button>
    </div>
  );
};

export type PromptInputProps = JSX.HTMLAttributes<HTMLFormElement> & {
  status?: ChatStatus;
  onSubmit?: (e: Event) => void;
  onInputChange?: (value: string) => void;
};

export const PromptInput: Component<PromptInputProps> = (props) => {
  const [localInput, setLocalInput] = createSignal("");
  const [localAttachments, setLocalAttachments] = createSignal<(FileUIPart & { id: string })[]>([]);
  let fileInputRef: HTMLInputElement | null = null;

  const controller = useOptionalPromptInputController();
  const textInput = controller?.textInput ?? {
    value: localInput,
    setInput: setLocalInput,
    clear: () => setLocalInput(""),
  };
  const attachments = controller?.attachments ?? {
    files: localAttachments,
    add: (files: File[] | FileList) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;
      setLocalAttachments((prev) =>
        prev.concat(
          incoming.map((file) => ({
            id: nanoid(),
            type: "file" as const,
            url: URL.createObjectURL(file),
            mediaType: file.type,
            filename: file.name,
          }))
        )
      );
    },
    remove: (id: string) => {
      setLocalAttachments((prev) => {
        const found = prev.find((f) => f.id === id);
        if (found?.url) {
          URL.revokeObjectURL(found.url);
        }
        return prev.filter((f) => f.id !== id);
      });
    },
    clear: () => {
      setLocalAttachments((prev) => {
        for (const f of prev) {
          if (f.url) {
            URL.revokeObjectURL(f.url);
          }
        }
        return [];
      });
    },
    openFileDialog: () => {
      fileInputRef?.click();
    },
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    const value = textInput.value();
    if (!value.trim()) return;
    props.onSubmit?.(e);
    // 提交后清空输入
    textInput.clear();
  };

  const handleInputChange = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    textInput.setInput(value);
    props.onInputChange?.(value);
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      attachments.add(target.files);
    }
  };

  const [, rest] = splitProps(props, ["class", "status", "onSubmit", "onInputChange", "children"]);

  return (
    <LocalAttachmentsContext.Provider value={attachments}>
      <form
        class={cn("flex flex-col gap-2", props.class)}
        onSubmit={handleSubmit}
        {...rest}
      >
        <Show when={attachments.files().length > 0}>
          <div class="flex flex-wrap gap-2">
            <For each={attachments.files()}>
              {(file) => <PromptInputAttachment data={file} />}
            </For>
          </div>
        </Show>
        <div class="flex items-end gap-2">
          <Textarea
            value={textInput.value()}
            onInput={handleInputChange}
            placeholder="输入消息..."
            rows={1}
            class="min-h-[60px] resize-none"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            class="hidden"
            onChange={handleFileChange}
            accept="image/*"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={attachments.openFileDialog}
          >
            <ImageIcon size={16} />
          </Button>
          <PromptInputSubmit status={props.status} />
        </div>
        {props.children}
      </form>
    </LocalAttachmentsContext.Provider>
  );
};

export type PromptInputSubmitProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  status?: ChatStatus;
};

export const PromptInputSubmit: Component<PromptInputSubmitProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "status", "children"]);

  let Icon = <CornerDownLeft size={16} />;

  if (props.status === "submitted") {
    Icon = <Loader2 size={16} class="animate-spin" />;
  } else if (props.status === "streaming") {
    Icon = <Square size={16} />;
  }

  return (
    <Button
      aria-label="Submit"
      class={cn(props.class)}
      size="icon"
      type="submit"
      variant="default"
      {...rest}
    >
      {props.children ?? Icon}
    </Button>
  );
};

