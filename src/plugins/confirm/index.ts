import { createPlugin } from "../../registry.js";
import { ConfirmField, ConfirmOption } from "./ConfirmField.js";

export interface ConfirmOptions {
	message?: string;
	label?: string; // Alternative to message for compatibility
	shortLabel?: string;
	options?: ConfirmOption[];
	allowLoop?: boolean;
	hintPosition?: "bottom" | "inline" | "side"; // Where to display option hints (default: "inline")
	initialValue?: any;
	id?: string;
}

export type { ConfirmOption } from "./ConfirmField.js";

// Enhanced confirm input plugin with custom options support
export const confirm = createPlugin<ConfirmOptions, any>({
	type: "confirm",
	component: ConfirmField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(
		opts: ConfirmOptions,
		context: {
			currentGroup?: string;
			saveOnEscape?: boolean;
			existingAnswer?: any;
		},
		id: string
	) {
		// Use existing answer as initial value if available
		const initialValue =
			context.existingAnswer !== undefined
				? context.existingAnswer
				: opts.initialValue;
		const isPreservedValue = context.existingAnswer !== undefined;
		return {
			...opts,
			initialValue,
			saveOnEscape: context.saveOnEscape,
			isPreservedValue,
		};
	},
});
