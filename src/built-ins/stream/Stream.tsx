import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { streamStore } from "./stream-store.js";
import type { StreamOptions, StreamStatus } from "./types.js";

export type { StreamOptions };

// Main component for the stream plugin
export const StreamDisplay = ({
	node,
	options,
	events,
}: {
	node: any;
	options: StreamOptions;
	events: any;
}) => {
	const [spinnerFrame, setSpinnerFrame] = useState(0);

	// Use the stream ID from options
	const streamId =
		options.streamId ||
		`stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

	// Subscribe to the stream store - auto-updates on any store change
	const store = streamStore.use();

	// Extract data for this stream
	const streamState = store.streams.get(streamId) || {
		status: "active",
		lines: [],
	};

	// Animated spinner frames (same as tasks)
	const spinnerFrames = ["⠂", "-", "–", "—", "–", "-"];

	// Animate spinner only when active/streaming
	useEffect(() => {
		if (streamState.status !== "active") {
			return;
		}

		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 150);

		return () => clearInterval(interval);
	}, [streamState.status]);

	// Auto-submit when completed or error
	useEffect(() => {
		if (node.state !== "active") return;

		if (
			(streamState.status === "completed" ||
				streamState.status === "error") &&
			events.onSubmit
		) {
			const delay =
				options.submitDelay !== undefined ? options.submitDelay : 0;

			// If hideOnCompletion and no delay, submit immediately
			if (options.hideOnCompletion && delay === 0) {
				events.onSubmit({ type: "auto" });
			} else {
				const timer = setTimeout(() => {
					events.onSubmit({ type: "auto" });
				}, delay);
				return () => clearTimeout(timer);
			}
		}
	}, [
		streamState.status,
		node.state,
		events.onSubmit,
		options.submitDelay,
		options.hideOnCompletion,
	]);

	// Hide if hideOnCompletion is true and stream is completed
	if (options.hideOnCompletion && node.state === "completed") {
		return null;
	}

	// Don't render completed/error state if hideOnCompletion is true and there's no delay
	if (
		options.hideOnCompletion &&
		(streamState.status === "completed" ||
			streamState.status === "error") &&
		(!options.submitDelay || options.submitDelay === 0)
	) {
		return null;
	}

	// Get the lines to display (respect maxLines if set)
	const linesToDisplay = options.maxLines
		? streamState.lines.slice(-options.maxLines)
		: streamState.lines;

	// Determine status symbol (without color)
	const getStatusSymbol = (status: StreamStatus): string => {
		if (status === "completed") return "■";
		if (status === "error") return "✗";
		return spinnerFrames[spinnerFrame]; // active - animated
	};

	// Determine status color
	const getStatusColor = (status: StreamStatus): string => {
		if (status === "completed") return "green";
		if (status === "error") return "red";
		return "blue"; // active
	};

	// Get label if set
	const label = streamState.label || options.label;

	return (
		<Box flexDirection="column">
			{label && (
				<Box marginBottom={linesToDisplay.length > 0 ? 1 : 0}>
					<Text color={getStatusColor(streamState.status)}>
						{getStatusSymbol(streamState.status)} {label}
					</Text>
				</Box>
			)}
			{linesToDisplay.map((line, index) => {
				const actualLineNumber = options.maxLines
					? streamState.lines.length -
					  linesToDisplay.length +
					  index +
					  1
					: index + 1;

				return (
					<Box key={`${streamId}-${actualLineNumber}`}>
						{options.showLineNumbers && (
							<Text dimColor>
								{actualLineNumber.toString().padStart(3)}{" "}
							</Text>
						)}
						{options.prefixSymbol && (
							<Text dimColor>{options.prefixSymbol} </Text>
						)}
						<Text>{line}</Text>
					</Box>
				);
			})}
		</Box>
	);
};
