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

	// The prompt logic - include conditional depth in the label
	prompt(opts: RadioOptions, { currentGroup, conditionalDepth }, id: string) {
		const depthIndicator = conditionalDepth && conditionalDepth > 0 ? ` [depth:${conditionalDepth}]` : "";
		const newLabel = opts.label + depthIndicator;

		// Debug logging to troubleshoot
		console.error(`📋 Radio processing: "${opts.label}" → "${newLabel}" (depth: ${conditionalDepth})`);

		return {
			...opts,
			label: newLabel,
		};
	},
});
