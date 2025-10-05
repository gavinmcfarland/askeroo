import { createRuntime } from "./core/core.js";
import { ui } from "./core/ui.js";

// Import and re-export types for better IDE support
import type { FlowFunction } from "./types/index.js";
export type { FlowFunction };

// Create runtime lazily to ensure all plugins are loaded first
let runtime: any = null;

function ensureRuntime() {
	if (!runtime) {
		runtime = createRuntime(ui);
	}
	return runtime;
}

// Export lazy runtime functions with proper types
export const ask = <T>(flow: FlowFunction<T>): Promise<T> =>
	ensureRuntime().executeFlow(flow);

// BACK is just a simple token, doesn't need lazy loading
export const BACK = { __back: true };

// Export runtime factory for advanced users
export { createRuntime } from "./core/core.js";

// Export plugin system for developers
export {
	registerPlugin,
	createPlugin,
	type PromptPlugin,
} from "./core/registry.js";

// Export plugins and their types
export { text, type TextOptions } from "./plugins/text/index.js";
export {
	confirm,
	type ConfirmOptions,
	type ConfirmOption,
} from "./plugins/confirm/index.js";
export { multi, type MultiOptions } from "./plugins/multi/index.js";
export { note } from "./plugins/note/index.js";
export {
	radio,
	type RadioOptions,
	type RadioOption,
} from "./plugins/radio/index.js";
export {
	tasks,
	TaskWarning,
	type Task,
	type TaskLabel,
} from "./plugins/tasks/index.js";
export {
	completedFields,
	type CompletedFieldsOptions,
} from "./plugins/completed-fields/index.js";
export {
	group,
	type GroupMeta,
	type GroupOpts,
	type GroupOptions,
} from "./plugins/group/index.js";

// Export markdown utilities
export { md, type MarkdownString } from "./utils/markdown.js";
