import { createPlugin } from "../../registry.js";
import { CompletedFieldsDisplay } from "./CompletedFields.js";

export interface CompletedFieldsOptions {
	filter?: string[];
	showGroupHeaders?: boolean;
	maxFields?: number;
	title?: string;
	emptyPlaceholder?: string;
}

// Internal plugin implementation
const completedFieldsInternal = createPlugin<CompletedFieldsOptions, void>({
	type: "completedFields",
	component: CompletedFieldsDisplay,
	interactive: false, // Completed fields display doesn't require user interaction

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: CompletedFieldsOptions, { currentGroup }, id: string) {
		return {
			showGroupHeaders: true,
			...opts,
		};
	},
});

// Public API with overloads for optional parameters
export function completedFields(): Promise<void>;
export function completedFields(options: CompletedFieldsOptions): Promise<void>;
export function completedFields(
	options: CompletedFieldsOptions = {}
): Promise<void> {
	return completedFieldsInternal(options);
}
