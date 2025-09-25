import { createPlugin } from '../../registry.js';
import { CompletedFieldsDisplay } from './CompletedFields.js';

export interface CompletedFieldsOptions {
	filter?: string[];
	showGroupHeaders?: boolean;
	maxFields?: number;
	title?: string;
}

// CompletedFields plugin
export const completedFields = createPlugin<CompletedFieldsOptions, void>({
	type: 'completedFields',
	component: CompletedFieldsDisplay,

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: CompletedFieldsOptions, { currentGroup }, id: string) {
		return {
			showGroupHeaders: true,
			...opts,
		};
	},
});