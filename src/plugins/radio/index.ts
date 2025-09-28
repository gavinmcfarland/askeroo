import { createPlugin } from "../../registry.js";
import { RadioField } from "./RadioField.js";
import { ValidatorFunction } from "../../types/validation.js";

export interface RadioOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

export interface RadioOptions {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
	maxVisible?: number; // Maximum number of options visible at once (enables scrolling)
	initialValue?: string;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string>;
}

// Core radio input plugin
export const radio = createPlugin<RadioOptions, string>({
	type: "radio",
	component: RadioField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: RadioOptions, { currentGroup }, id: string) {
		return opts;
	},
});
