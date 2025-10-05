import React from 'react';
import { createPlugin } from '../../registry.js';
import { MarkdownString, parseMarkdown, isMarkdownString } from '../../utils/markdown.js';
import { Box } from 'ink';

export interface NoteOptions {
	message: string | MarkdownString;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Internal plugin implementation
const noteInternal = createPlugin<NoteOptions, void>({
	type: 'note',
	interactive: false, // Notes don't require user interaction

	render: () => function NoteDisplay(props: any) {
		const isMarkdownObject = isMarkdownString(props.message);
		
		return (
			<Box flexDirection="column">
				{parseMarkdown(
					isMarkdownObject
						? (props.message as MarkdownString).content
						: (props.message as string) || "",
					isMarkdownObject
						? (props.message as MarkdownString).theme
						: undefined
				)}
			</Box>
		);
	},

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: NoteOptions, { currentGroup }, id: string) {
		return opts;
	},
});

// Public API function
export function note(message: string | MarkdownString): Promise<void> {
	return noteInternal({ message });
}