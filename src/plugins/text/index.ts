import { createPlugin } from "../../registry.js";
import { TextField } from "./TextField.js";

export interface TextOptions {
	message: string;
	shortMessage?: string;
	id?: string;
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	component: TextField,

	// The prompt logic - called by the engine
	async prompt(opts: TextOptions, { extendedUI, currentGroup }, id: string) {
		return extendedUI.text(opts, currentGroup, id);
	},

	// No uiHandler needed - the UI will be handled by PromptApp components
	uiHandler: {},
});
