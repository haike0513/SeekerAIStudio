/**
 * AI Elements - SolidJS 版本
 * 基于 Vercel AI Elements React 版本转换
 */

// Chat 组件
export { Chat } from "./chat";
export type { ChatProps } from "./chat";

// Message 组件
export {
  Message,
  MessageContent,
  MessageActions,
  MessageAction,
  MessageBranch,
  MessageBranchContent,
  MessageBranchSelector,
  MessageBranchPrevious,
  MessageBranchNext,
  MessageBranchPage,
  MessageResponse,
  MessageAttachment,
  MessageAttachments,
  MessageToolbar,
} from "./message";

export type {
  MessageProps,
  MessageContentProps,
  MessageActionsProps,
  MessageActionProps,
  MessageBranchProps,
  MessageBranchContentProps,
  MessageBranchSelectorProps,
  MessageBranchPreviousProps,
  MessageBranchNextProps,
  MessageBranchPageProps,
  MessageResponseProps,
  MessageAttachmentProps,
  MessageAttachmentsProps,
  MessageToolbarProps,
} from "./message";

// PromptInput 组件
export {
  PromptInputProvider,
  PromptInput,
  PromptInputSubmit,
  PromptInputAttachment,
  Input,
  PromptInputTextarea,
  usePromptInputController,
  useProviderAttachments,
  usePromptInputAttachments,
} from "./prompt-input";

export type {
  PromptInputProviderProps,
  PromptInputProps,
  PromptInputSubmitProps,
  PromptInputAttachmentProps,
  InputProps,
  PromptInputTextareaProps,
  AttachmentsContext,
  TextInputContext,
  PromptInputControllerProps,
} from "./prompt-input";

// Tool 组件
export {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "./tool";

export type {
  ToolProps,
  ToolHeaderProps,
  ToolContentProps,
  ToolInputProps,
  ToolOutputProps,
} from "./tool";

// CodeBlock 组件
export {
  CodeBlock,
  CodeBlockCopyButton,
} from "./code-block";

export type {
  CodeBlockProps,
  CodeBlockCopyButtonProps,
} from "./code-block";

// Loader 组件
export { Loader } from "./loader";
export type { LoaderProps } from "./loader";

// Suggestion 组件
export {
  Suggestions,
  Suggestion,
} from "./suggestion";

export type {
  SuggestionsProps,
  SuggestionProps,
} from "./suggestion";

// Confirmation 组件
export {
  Confirmation,
  ConfirmationTitle,
  ConfirmationRequest,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationActions,
  ConfirmationAction,
} from "./confirmation";

export type {
  ConfirmationProps,
  ConfirmationTitleProps,
  ConfirmationRequestProps,
  ConfirmationAcceptedProps,
  ConfirmationRejectedProps,
  ConfirmationActionsProps,
  ConfirmationActionProps,
} from "./confirmation";

// Shimmer 组件
export { Shimmer } from "./shimmer";
export type { TextShimmerProps } from "./shimmer";

// Sources 组件
export {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "./sources";

export type {
  SourcesProps,
  SourcesTriggerProps,
  SourcesContentProps,
  SourceProps,
} from "./sources";

// Image 组件
export { Image } from "./image";
export type { ImageProps } from "./image";

// InlineCitation 组件
export {
  InlineCitation,
  InlineCitationText,
  InlineCitationCard,
  InlineCitationCardTrigger,
  InlineCitationCardBody,
  InlineCitationCarousel,
  InlineCitationCarouselContent,
  InlineCitationCarouselItem,
  InlineCitationCarouselHeader,
  InlineCitationCarouselIndex,
  InlineCitationCarouselPrev,
  InlineCitationCarouselNext,
  InlineCitationSource,
  InlineCitationQuote,
} from "./inline-citation";

export type {
  InlineCitationProps,
  InlineCitationTextProps,
  InlineCitationCardProps,
  InlineCitationCardTriggerProps,
  InlineCitationCardBodyProps,
  InlineCitationCarouselProps,
  InlineCitationCarouselContentProps,
  InlineCitationCarouselItemProps,
  InlineCitationCarouselHeaderProps,
  InlineCitationCarouselIndexProps,
  InlineCitationCarouselPrevProps,
  InlineCitationCarouselNextProps,
  InlineCitationSourceProps,
  InlineCitationQuoteProps,
} from "./inline-citation";

// Reasoning 组件
export {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
  useReasoning,
} from "./reasoning";

export type {
  ReasoningProps,
  ReasoningTriggerProps,
  ReasoningContentProps,
} from "./reasoning";

// ChainOfThought 组件
export {
  ChainOfThought,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  ChainOfThoughtSearchResults,
  ChainOfThoughtSearchResult,
  ChainOfThoughtContent,
  ChainOfThoughtImage,
} from "./chain-of-thought";

export type {
  ChainOfThoughtProps,
  ChainOfThoughtHeaderProps,
  ChainOfThoughtStepProps,
  ChainOfThoughtSearchResultsProps,
  ChainOfThoughtSearchResultProps,
  ChainOfThoughtContentProps,
  ChainOfThoughtImageProps,
} from "./chain-of-thought";

// Artifact 组件
export {
  Artifact,
  ArtifactHeader,
  ArtifactClose,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
} from "./artifact";

export type {
  ArtifactProps,
  ArtifactHeaderProps,
  ArtifactCloseProps,
  ArtifactTitleProps,
  ArtifactDescriptionProps,
  ArtifactActionsProps,
  ArtifactActionProps,
} from "./artifact";

// Checkpoint 组件
export {
  Checkpoint,
  CheckpointIcon,
  CheckpointTrigger,
} from "./checkpoint";

export type {
  CheckpointProps,
  CheckpointIconProps,
  CheckpointTriggerProps,
} from "./checkpoint";

// Context 组件
export {
  Context,
  ContextTrigger,
  ContextContent,
  ContextContentHeader,
  ContextContentBody,
  ContextContentFooter,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextCacheUsage,
} from "./context";

export type {
  ContextProps,
  ContextTriggerProps,
  ContextContentProps,
  ContextContentHeaderProps,
  ContextContentBodyProps,
  ContextContentFooterProps,
  ContextInputUsageProps,
  ContextOutputUsageProps,
  ContextReasoningUsageProps,
  ContextCacheUsageProps,
} from "./context";

// Conversation 组件
export {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "./conversation";

export type {
  ConversationProps,
  ConversationContentProps,
  ConversationEmptyStateProps,
  ConversationScrollButtonProps,
} from "./conversation";

// Plan 组件
export {
  Plan,
  PlanHeader,
  PlanTitle,
  PlanDescription,
  PlanAction,
  PlanContent,
  PlanFooter,
  PlanTrigger,
} from "./plan";

export type {
  PlanProps,
  PlanHeaderProps,
  PlanTitleProps,
  PlanDescriptionProps,
  PlanActionProps,
  PlanContentProps,
  PlanFooterProps,
  PlanTriggerProps,
} from "./plan";

// Queue 组件
export {
  Queue,
  QueueList,
  QueueItem,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
  QueueItemActions,
  QueueItemAction,
  QueueItemAttachment,
  QueueItemImage,
  QueueItemFile,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
} from "./queue";

export type {
  QueueProps,
  QueueListProps,
  QueueItemProps,
  QueueItemIndicatorProps,
  QueueItemContentProps,
  QueueItemDescriptionProps,
  QueueItemActionsProps,
  QueueItemActionProps,
  QueueItemAttachmentProps,
  QueueItemImageProps,
  QueueItemFileProps,
  QueueSectionProps,
  QueueSectionTriggerProps,
  QueueSectionLabelProps,
  QueueSectionContentProps,
  QueueMessage,
  QueueMessagePart,
  QueueTodo,
} from "./queue";

// Task 组件
export {
  Task,
  TaskTrigger,
  TaskContent,
  TaskItem,
  TaskItemFile,
} from "./task";

export type {
  TaskProps,
  TaskTriggerProps,
  TaskContentProps,
  TaskItemProps,
  TaskItemFileProps,
} from "./task";

// WebPreview 组件
export {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from "./web-preview";

export type {
  WebPreviewProps,
  WebPreviewNavigationProps,
  WebPreviewNavigationButtonProps,
  WebPreviewUrlProps,
  WebPreviewBodyProps,
  WebPreviewConsoleProps,
} from "./web-preview";

// ModelSelector 组件
export {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorDialog,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorShortcut,
  ModelSelectorSeparator,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "./model-selector";

export type {
  ModelSelectorProps,
  ModelSelectorTriggerProps,
  ModelSelectorContentProps,
  ModelSelectorDialogProps,
  ModelSelectorInputProps,
  ModelSelectorListProps,
  ModelSelectorEmptyProps,
  ModelSelectorGroupProps,
  ModelSelectorItemProps,
  ModelSelectorShortcutProps,
  ModelSelectorSeparatorProps,
  ModelSelectorLogoProps,
  ModelSelectorLogoGroupProps,
  ModelSelectorNameProps,
} from "./model-selector";

// OpenInChat 组件
export {
  OpenInChat,
} from "./open-in-chat";

export type {
  OpenInChatProps,
} from "./open-in-chat";

// Canvas 组件（需要 ReactFlow）
export {
  Canvas,
} from "./canvas";

export type {
  CanvasProps,
} from "./canvas";

// Connection 组件（需要 ReactFlow）
export {
  Connection,
} from "./connection";

export type {
  ConnectionProps,
} from "./connection";

// Controls 组件（需要 ReactFlow）
export {
  Controls,
} from "./controls";

export type {
  ControlsProps,
} from "./controls";

// Edge 组件（需要 ReactFlow）
export {
  Edge,
} from "./edge";

export type {
  EdgeProps,
} from "./edge";

// Node 组件（需要 ReactFlow）
export {
  Node,
  NodeHeader,
  NodeTitle,
  NodeDescription,
  NodeAction,
  NodeContent,
  NodeFooter,
} from "./node";

export type {
  NodeProps,
  NodeHeaderProps,
  NodeTitleProps,
  NodeDescriptionProps,
  NodeActionProps,
  NodeContentProps,
  NodeFooterProps,
} from "./node";

// Panel 组件（需要 ReactFlow）
export {
  Panel,
} from "./panel";

export type {
  PanelProps,
} from "./panel";

// Toolbar 组件（需要 ReactFlow）
export {
  Toolbar,
} from "./toolbar";

export type {
  ToolbarProps,
} from "./toolbar";

