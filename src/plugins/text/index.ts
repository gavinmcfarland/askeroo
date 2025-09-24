import { createPlugin } from "../../registry.js";
import { TextField } from "./TextField.js";

export interface TextOptions {
	message: string;
	shortMessage?: string;
	initialValue?: string;
	id?: string;
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
