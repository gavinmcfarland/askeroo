import { createPlugin } from "../../registry.js";
import { TextField } from "./TextField.js";
import { ValidatorFunction } from "../../types/index.js";

export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string>;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	component: TextField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: TextOptions, { currentGroup }, id: string) {
		return opts;
	},
});
