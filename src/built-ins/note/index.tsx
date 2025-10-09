import React, { useEffect } from "react";
import { createPrompt } from "../../core/registry.js";
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
const noteInternal = createPrompt<NoteOptions, void>({
	type: "note",

	component: ({ node, options, events }: any) => {
		const msg = options.message;
		const isMarkdown = isMarkdownString(msg);

		// Auto-submit when component becomes active
		useEffect(() => {
			if (node.state === "active" && events.onSubmit) {
				// setTimeout is now baked into onSubmit for auto submissions
				events.onSubmit({ type: "auto" });
			}
		}, [node.state, events.onSubmit]);

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

// Public API function - supports both simple string and options
export function note(
	message: string | MarkdownString,
	options?: { allowBack?: boolean }
): Promise<void> {
	return noteInternal({ message, ...options });
}
