import React from "react";
import { createPlugin } from "../../core/registry.js";
import {
	MarkdownString,
	parseMarkdown,
	isMarkdownString,
} from "../../utils/markdown.js";
import { Box } from "ink";

/**
 * User-provided options for the note plugin
 */
export interface NoteOptions {
	message: string | MarkdownString;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// meta?
}

// Internal plugin implementation
const noteInternal = createPlugin<NoteOptions, void>({
	type: "note",
	interactive: false, // Notes don't require user interaction

	component: ({ node, options, events }: any) => {
		const isMarkdownObject = isMarkdownString(options.message);

		return (
			<Box flexDirection="column">
				{parseMarkdown(
					isMarkdownObject
						? (options.message as MarkdownString).content
						: (options.message as string) || "",
					isMarkdownObject
						? (options.message as MarkdownString).theme
						: undefined
				)}
			</Box>
		);
	},
});

// Public API function
export function note(message: string | MarkdownString): Promise<void> {
	return noteInternal({ message });
}
