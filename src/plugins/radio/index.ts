import { createPlugin } from "../../registry.js";
import { RadioField } from "./RadioField.js";

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
	initialValue?: string;
	id?: string;
}

// Core radio input plugin
export const radio = createPlugin<RadioOptions, string>({
	type: "radio",
	component: RadioField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: RadioOptions, context: { currentGroup?: string; saveOnEscape?: boolean; existingAnswer?: any }, id: string) {
		// Use existing answer as initial value if available
		const initialValue = context.existingAnswer !== undefined ? context.existingAnswer : opts.initialValue;
		return { ...opts, initialValue, saveOnEscape: context.saveOnEscape };
	},
});