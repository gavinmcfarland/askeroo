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

	// Use the stream ID from options (should always be provided)
	const streamId =
		options.streamId ||
		`stream_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

	// Subscribe to the stream store - auto-updates on any store change
	const store = streamStore.use();

	// Extract data for this stream
	const streamState = store.streams.get(streamId) || {
		status: "active" as const,
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

	// Auto-submit immediately (to avoid blocking runtime)
	// This allows the runtime to proceed while the stream continues updating in the background
	// Use deferCompletion to prevent the node from being marked as completed immediately
	useEffect(() => {
		if (node.state === "active" && events.onSubmit) {
			// Submit immediately to allow runtime to continue, but defer completion
			events.onSubmit({ type: "auto", deferCompletion: true });
		}
	}, [node.state, events.onSubmit]);

	// Mark node as completed when stream finishes
	useEffect(() => {
		if (
			(streamState.status === "completed" ||
				streamState.status === "error") &&
			events.onComplete
		) {
			// If there's a submitDelay, wait for it before marking as complete
			if (options.submitDelay && options.submitDelay > 0) {
				const timer = setTimeout(() => {
					events.onComplete(); // PluginWrapper handles the promptId
				}, options.submitDelay);
				return () => clearTimeout(timer);
			} else {
				// Mark as complete immediately
				events.onComplete(); // PluginWrapper handles the promptId
			}
		}
	}, [streamState.status, events.onComplete, options.submitDelay]);

	// Track whether we should hide after delay
	const [shouldHideAfterDelay, setShouldHideAfterDelay] = useState(false);

	// Handle delayed hiding when stream completes with submitDelay
	useEffect(() => {
		// Only applies when hideOnCompletion is true and there's a submitDelay
		if (
			!options.hideOnCompletion ||
			!options.submitDelay ||
			options.submitDelay === 0
		) {
			return;
		}

		// When stream finishes, wait for submitDelay then trigger hiding
		if (
			streamState.status === "completed" ||
			streamState.status === "error"
		) {
			const timer = setTimeout(() => {
				setShouldHideAfterDelay(true);
			}, options.submitDelay);

			return () => clearTimeout(timer);
		}
	}, [streamState.status, options.submitDelay, options.hideOnCompletion]);

	// Hide if hideOnCompletion is true and conditions are met
	if (options.hideOnCompletion && node.state === "completed") {
		const streamFinished =
			streamState.status === "completed" ||
			streamState.status === "error";

		// If stream finished and either no delay or delay has elapsed
		if (streamFinished) {
			// No delay: hide immediately
			if (!options.submitDelay || options.submitDelay === 0) {
				return null;
			}
			// With delay: hide after delay timer completes
			if (shouldHideAfterDelay) {
				return null;
			}
		}
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
				<Text color={getStatusColor(streamState.status)}>
					{getStatusSymbol(streamState.status)} {label}
				</Text>
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
