/**
 * Confirmation 组件（SolidJS 版本）
 * 用于工具调用的确认和批准
 */

import { type Component, type JSX, createContext, useContext, Show, splitProps } from "solid-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ToolUIPart } from "ai";

type ToolUIPartApproval =
  | {
      id: string;
      approved?: never;
      reason?: never;
    }
  | {
      id: string;
      approved: boolean;
      reason?: string;
    }
  | {
      id: string;
      approved: true;
      reason?: string;
    }
  | {
      id: string;
      approved: false;
      reason?: string;
    }
  | undefined;

type ConfirmationContextValue = {
  approval: ToolUIPartApproval;
  state: ToolUIPart["state"];
};

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation");
  }
  return context;
};

export type ConfirmationProps = JSX.HTMLAttributes<HTMLDivElement> & {
  approval?: ToolUIPartApproval;
  state: ToolUIPart["state"];
};

export const Confirmation: Component<ConfirmationProps> = (props) => {
  const [, rest] = splitProps(props, ["class", "approval", "state", "children"]);

  if (
    !props.approval ||
    props.state === "input-streaming" ||
    props.state === "input-available"
  ) {
    return null;
  }

  return (
    <ConfirmationContext.Provider value={{ approval: props.approval, state: props.state }}>
      <Alert class={cn("flex flex-col gap-2", props.class)} {...rest}>
        {props.children}
      </Alert>
    </ConfirmationContext.Provider>
  );
};

export type ConfirmationTitleProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ConfirmationTitle: Component<ConfirmationTitleProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <AlertDescription class={cn("inline", props.class)} {...rest} />
  );
};

export type ConfirmationRequestProps = {
  children?: JSX.Element;
};

export const ConfirmationRequest: Component<ConfirmationRequestProps> = (props) => {
  const { state } = useConfirmation();

  // Only show when approval is requested
  // @ts-expect-error state only available in AI SDK v6
  return (
    <Show when={state === "approval-requested"}>
      {props.children}
    </Show>
  );
};

export type ConfirmationAcceptedProps = {
  children?: JSX.Element;
};

export const ConfirmationAccepted: Component<ConfirmationAcceptedProps> = (props) => {
  const { approval, state } = useConfirmation();

  // Only show when approved and in response states
  const shouldShow = () => {
    if (!approval?.approved) return false;
    // @ts-expect-error state only available in AI SDK v6
    return (
      state === "approval-responded" ||
      state === "output-denied" ||
      state === "output-available"
    );
  };

  return (
    <Show when={shouldShow()}>
      {props.children}
    </Show>
  );
};

export type ConfirmationRejectedProps = {
  children?: JSX.Element;
};

export const ConfirmationRejected: Component<ConfirmationRejectedProps> = (props) => {
  const { approval, state } = useConfirmation();

  // Only show when rejected and in response states
  const shouldShow = () => {
    if (approval?.approved !== false) return false;
    // @ts-expect-error state only available in AI SDK v6
    return (
      state === "approval-responded" ||
      state === "output-denied" ||
      state === "output-available"
    );
  };

  return (
    <Show when={shouldShow()}>
      {props.children}
    </Show>
  );
};

export type ConfirmationActionsProps = JSX.HTMLAttributes<HTMLDivElement>;

export const ConfirmationActions: Component<ConfirmationActionsProps> = (props) => {
  const { state } = useConfirmation();
  const [, rest] = splitProps(props, ["class", "children"]);

  // Only show when approval is requested
  // @ts-expect-error state only available in AI SDK v6
  return (
    <Show when={state === "approval-requested"}>
      <div
        class={cn("flex items-center justify-end gap-2 self-end", props.class)}
        {...rest}
      >
        {props.children}
      </div>
    </Show>
  );
};

export type ConfirmationActionProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ConfirmationAction: Component<ConfirmationActionProps> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  
  return (
    <Button class={cn("h-8 px-3 text-sm", props.class)} type="button" {...rest} />
  );
};

