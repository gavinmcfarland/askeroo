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
	autoSubmit: true, // Notes auto-submit without user interaction

	component: ({ node, options, events }: any) => {
		const msg = options.message;
		const isMarkdown = isMarkdownString(msg);

		return (
			<Box flexDirection="column">
				{parseMarkdown(
					isMarkdown ? msg.content : msg || "",
					isMarkdown ? msg.theme : undefined
				)}
			</Box>
		);
	},
});

// Public API function
export function note(message: string | MarkdownString): Promise<void> {
	return noteInternal({ message });
}
