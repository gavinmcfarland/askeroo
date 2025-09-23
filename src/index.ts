import { createRuntime } from "./core.js";
import { ui } from "./ui.js";

// Type definitions for better IDE support
export type GroupOpts = { message?: string; flow?: "phase" | "static" };
export type FlowFunction<T> = (api: {
	group: (opts: GroupOpts, body: () => Promise<any>) => Promise<any>;
	text: any;
	confirm: any;
	BACK: { __back: true };
}) => Promise<T>;

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
export const group = (
	opts: GroupOpts,
	body: () => Promise<any>
): Promise<any> => ensureRuntime().group(opts, body);
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
