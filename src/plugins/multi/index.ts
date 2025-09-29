import { createPlugin } from "../../registry.js";
import { MultiField } from "./MultiField.js";
import { ValidatorFunction } from "../../types/validation.js";

export interface MultiOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

export interface MultiOptions {
	label?: string;
	message?: string; // Alternative to label for compatibility
	shortLabel?: string;
	options?: string[] | MultiOption[];
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean;
	allowLoop?: boolean;
	searchable?: boolean;
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
	maxVisible?: number; // Maximum number of options visible at once (enables scrolling)
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string[]>;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Example multi-select prompt plugin
export const multi = createPlugin<MultiOptions, string[]>({
	type: "multi",
	component: MultiField, // Plugin provides its own component

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: MultiOptions, { currentGroup }, id: string) {
		return opts;
	},
});
