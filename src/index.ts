import { createRuntime } from "./core.js";
import { ui } from "./ui.js";

// Type definitions for better IDE support
export type GroupMeta = { message?: string; id?: string };
export type GroupOpts =
	| { flow?: "progressive"; enableArrowNavigation?: never }
	| { flow: "phased"; enableArrowNavigation?: never }
	| { flow: "static"; enableArrowNavigation?: boolean }
	| { flow?: undefined; enableArrowNavigation?: never };
export type FlowFunction<T> = (api: {
	group: {
		(meta: GroupMeta, body: () => Promise<any>, opts?: GroupOpts): Promise<any>;
		(body: () => Promise<any>, opts?: GroupOpts & GroupMeta): Promise<any>;
	};
	BACK: { __back: true };
} & Record<string, any>) => Promise<T>;

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
	if (typeof metaOrBody === 'function') {
		// Old signature: group(body, opts)
		return ensureRuntime().group({}, metaOrBody, bodyOrOpts as GroupOpts);
	} else {
		// New signature: group(meta, body, opts)
		return ensureRuntime().group(metaOrBody, bodyOrOpts as () => Promise<any>, opts);
	}
}
// BACK is just a simple token, doesn't need lazy loading
export const BACK = { __back: true };

// Export runtime factory and UI
export { createRuntime } from "./core.js";
export { ui };

// Export plugins and their types
export { text, type TextOptions } from "./plugins/text/index.js";
export { confirm, type ConfirmOptions } from "./plugins/confirm/index.js";
export {
	customText,
	type CustomTextOptions,
} from "./plugins/custom-text/index.js";
export { multi, type MultiOptions } from "./plugins/multi/index.js";
export {
	validatedText,
	type ValidatedTextOptions,
} from "./plugins/validated-text/index.js";
export { note } from "./plugins/note/index.js";

// Export markdown utilities
export { md, mdString, mdWithTheme, type MarkdownString } from "./utils/markdown.js";
