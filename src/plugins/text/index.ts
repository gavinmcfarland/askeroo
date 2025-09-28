import { createPlugin } from "../../registry.js";
import { TextField } from "./TextField.js";
import { ValidatorFunction } from "../../types/validation.js";

export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string>;
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	component: TextField,

	// The prompt logic - include conditional depth in the label
	prompt(opts: TextOptions, { currentGroup, conditionalDepth }, id: string) {
		const depthIndicator = conditionalDepth && conditionalDepth > 0 ? ` [depth:${conditionalDepth}]` : "";
		return {
			...opts,
			label: opts.label + depthIndicator,
		};
	},
});
