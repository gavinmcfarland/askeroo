import { createRuntime } from "./core.js";
import { ui } from "./ui.js";

// Import plugins to ensure they register themselves
import "./plugins/completed-fields/CompletedFields.js";

// Import and re-export types for better IDE support
import type { GroupMeta, GroupOpts, FlowFunction } from "./types/index.js";
export type { GroupMeta, GroupOpts, FlowFunction };

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
	ensureRuntime().ask(flow);
// Support both old and new signatures for backward compatibility
export function group(
	meta: GroupMeta,
	body: () => Promise<any>,
	opts?: GroupOpts
): Promise<any>;
export function group(
	body: () => Promise<any>,
	opts?: GroupOpts & GroupMeta
): Promise<any>;
export function group(
	metaOrBody: GroupMeta | (() => Promise<any>),
	bodyOrOpts?: (() => Promise<any>) | (GroupOpts & GroupMeta),
	opts?: GroupOpts
): Promise<any> {
	if (typeof metaOrBody === "function") {
		// Old signature: group(body, opts)
		return ensureRuntime().group({}, metaOrBody, bodyOrOpts as GroupOpts);
	} else {
		// New signature: group(meta, body, opts)
		return ensureRuntime().group(
			metaOrBody,
			bodyOrOpts as () => Promise<any>,
			opts
		);
	}
}
// BACK is just a simple token, doesn't need lazy loading
export const BACK = { __back: true };

// Export runtime factory and UI
export { createRuntime } from "./core.js";
export { ui };

// Export plugin system for developers
export {
	globalRegistry,
	registerPlugin,
	createPlugin,
	type PromptPlugin,
} from "./registry.js";

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

// Export markdown utilities
export {
	md,
	mdString,
	mdWithTheme,
	type MarkdownString,
} from "./utils/markdown.js";
