import React, { useEffect } from "react";
import { Box } from "ink";
import {
	parseMarkdown,
	isMarkdownString,
	MarkdownString,
} from "../../utils/markdown.js";

export interface NoteOptions {
	message: string | MarkdownString;
	// Plugin component props
	onSubmit?: (value: void) => void;
	onBack?: () => void;
	completed?: boolean;
	disabled?: boolean;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Main component for the plugin
export function NoteDisplay(props: NoteOptions) {
	// Auto-resolve the prompt without user input
	useEffect(() => {
		if (props.onSubmit && !props.completed && !props.disabled) {
			// Auto-submit immediately when the component mounts
			const timer = setTimeout(() => {
				props.onSubmit!(undefined as any);
			}, 100); // Small delay to ensure rendering

			return () => clearTimeout(timer);
		}
	}, [props.onSubmit, props.completed, props.disabled]);

	// Check if message is a MarkdownString object
	const isMarkdownObject = isMarkdownString(props.message);

	return (
		<Box flexDirection="column">
			{/* Always render as markdown - plain text will render normally */}
			<>
				{parseMarkdown(
					isMarkdownObject
						? (props.message as MarkdownString).content
						: props.message as string,
					isMarkdownObject
						? (props.message as MarkdownString).theme
						: undefined
				)}
			</>
		</Box>
	);
}
