import { createPrompt } from "../../core/registry.js";
import { MultiField, MultiOptions } from "./MultiField.js";

// Re-export types
export type { MultiOptions };

// Multi-select prompt plugin
export const multi = createPrompt<MultiOptions, string[]>({
	type: "multi",
	component: MultiField,
});
