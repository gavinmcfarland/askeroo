import { createPlugin } from "../../registry.js";
import { TextField } from "./TextField.js";

export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
	id?: string;
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	component: TextField,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: TextOptions, context: { currentGroup?: string; saveOnEscape?: boolean; existingAnswer?: any }, id: string) {
		// Use existing answer as initial value if available
		const initialValue = context.existingAnswer !== undefined ? context.existingAnswer : opts.initialValue;
		return { ...opts, initialValue, saveOnEscape: context.saveOnEscape };
	},
});
