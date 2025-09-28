import { createPlugin } from "../../registry.js";
import { ConfirmField, ConfirmOption } from "./ConfirmField.js";
import { ValidatorFunction } from "../../types/validation.js";

export interface ConfirmOptions {
	label?: string;
	message?: string; // Alternative to label for compatibility
	shortLabel?: string;
	options?: ConfirmOption[];
	allowLoop?: boolean;
	hintPosition?: "bottom" | "inline" | "side"; // Where to display option hints (default: "inline")
	initialValue?: any;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<any>;
}

export type { ConfirmOption } from "./ConfirmField.js";

// Enhanced confirm input plugin with custom options support
export const confirm = createPlugin<ConfirmOptions, any>({
	type: "confirm",
	component: ConfirmField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: ConfirmOptions, { currentGroup, conditionalDepth }, id: string) {
		// Add depth indicator to label if we're in a conditional context
		const depthIndicator = conditionalDepth && conditionalDepth > 0 ? ` [depth:${conditionalDepth}]` : "";
		const enhancedLabel = opts.label ? `${opts.label}${depthIndicator}` : opts.label;

		// Optional debug logging
		if (process.env.DEBUG_DEPTH) {
			console.error(`📋 Confirm processing: "${opts.label}" → "${enhancedLabel}" (depth: ${conditionalDepth})`);
		}

		return {
			...opts,
			label: enhancedLabel,
		};
	},
});
