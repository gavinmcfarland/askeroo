import { createPlugin } from '../../registry.js';
import { NoteDisplay, NoteOptions } from './Note.js';
import { MarkdownString } from '../../utils/markdown.js';

// Internal plugin implementation
const noteInternal = createPlugin<NoteOptions, void>({
	type: 'note',
	component: NoteDisplay,
	interactive: false, // Notes don't require user interaction

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: NoteOptions, { currentGroup }, id: string) {
		return opts;
	},
});

// Public API function
export function note(message: string | MarkdownString): Promise<void> {
	return noteInternal({ message });
}