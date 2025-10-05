import React from "react";
import { Box } from "ink";
import {
	parseMarkdown,
	isMarkdownString,
	MarkdownString,
} from "../../utils/markdown.js";
import { PluginState } from "../../types/index.js";

export interface NoteOptions {
	message: string | MarkdownString;
	// Plugin component props
	onSubmit?: (value: void) => void;
	onBack?: () => void;
	state?: PluginState;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Main component for the plugin
export function NoteDisplay(props: NoteOptions) {
	// Check if message is a MarkdownString object
	const isMarkdownObject = isMarkdownString(props.message);

	return (
		<Box flexDirection="column">
			{/* Always render as markdown - plain text will render normally */}
			<>
				{parseMarkdown(
					isMarkdownObject
						? (props.message as MarkdownString).content
						: (props.message as string) || "",
					isMarkdownObject
						? (props.message as MarkdownString).theme
						: undefined
				)}
			</>
		</Box>
	);
}
