// Import and re-export types for better IDE support
import type { FlowFunction } from "./types/index.js";
export type { FlowFunction };

// Export the new customizable ask function
export { ask } from "./built-ins/ask/index.js";

// BACK is just a simple token, doesn't need lazy loading
export const BACK = { __back: true };

// Export runtime factory for advanced users
export { createRuntime } from "./core/core.js";

// Export plugin system for developers
export {
	registerPlugin,
	createPrompt,
	type PromptPlugin,
} from "./core/registry.js";

// Export plugins and their types
export { text, type TextOptions } from "./built-ins/text/index.js";
export {
	confirm,
	type ConfirmOptions,
	type ConfirmOption,
} from "./built-ins/confirm/index.js";
export { multi, type MultiOptions } from "./built-ins/multi/index.js";
export { note } from "./built-ins/note/index.js";
export {
	radio,
	type RadioOptions,
	type RadioOption,
} from "./built-ins/radio/index.js";
export {
	tasks,
	TaskWarning,
	type Task,
	type TaskLabel,
} from "./built-ins/tasks/index.js";
export {
	spinner,
	type SpinnerLabel,
	type SpinnerStatus,
	type SpinnerState,
} from "./built-ins/spinner/index.js";
export {
	completedFields,
	type CompletedFieldsOptions,
} from "./built-ins/completed-fields/index.js";
export {
	group,
	type GroupMeta,
	type GroupOpts,
	type GroupOptions,
} from "./built-ins/group/index.js";
export { createAsk } from "./core/ask-factory.js";
export { type AskOptions } from "./built-ins/ask/index.js";

// Export markdown utilities
export { md, type MarkdownString } from "./utils/markdown.js";
