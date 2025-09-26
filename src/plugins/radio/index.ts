import { createPlugin } from "../../registry.js";
import { RadioField } from "./RadioField.js";

export interface RadioOption {
	value: string;
	label: string;
}

export interface RadioOptions {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	initialValue?: string;
	id?: string;
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