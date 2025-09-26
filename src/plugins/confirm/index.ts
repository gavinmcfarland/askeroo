import { createPlugin } from "../../registry.js";
import { ConfirmField, ConfirmOption } from "./ConfirmField.js";

export interface ConfirmOptions {
	label?: string;
	message?: string; // Alternative to label for compatibility
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
	prompt(opts: ConfirmOptions, { currentGroup }, id: string) {
		return opts;
	},
});
