import { createPrompt } from "../../core/registry.js";
import { StreamDisplay } from "./Stream.js";
import { streamStore } from "./stream-store.js";
import type { StreamOptions, StreamController } from "./types.js";

// Re-export types
export type { StreamOptions, StreamStatus, StreamState } from "./types.js";

// Track the most recent stream ID
let currentStreamId: string | null = null;

// Internal plugin implementation
const streamInternal = createPrompt<StreamOptions, void>({
	type: "stream",
	component: StreamDisplay,
});

// Function to update stream state
function updateStreamState(
	streamId: string,
	updates: {
		status?: "active" | "completed" | "error";
		lines?: string[];
		label?: string;
	}
) {
	streamStore.update((s) => {
		const currentState = s.streams.get(streamId) || {
			status: "active",
			lines: [],
		};

		s.streams.set(streamId, {
			status:
				updates.status !== undefined
					? updates.status
					: currentState.status,
			lines:
				updates.lines !== undefined
					? updates.lines
					: currentState.lines,
			label:
				updates.label !== undefined
					? updates.label
					: currentState.label,
		});
		s.revision++;
	});
}

// Public API function overloads
export async function stream(
	label?: string,
	options?: Omit<StreamOptions, "label" | "streamId">
): Promise<StreamController>;
export async function stream(
	options?: StreamOptions
): Promise<StreamController>;

// Implementation
export async function stream(
	labelOrOptions?: string | StreamOptions,
	options?: Omit<StreamOptions, "label" | "streamId">
): Promise<StreamController> {
	// Determine if first arg is label or options
	const isOptionsObject = typeof labelOrOptions === "object";
	const label = isOptionsObject ? labelOrOptions?.label : labelOrOptions;
	const finalOptions = isOptionsObject ? labelOrOptions : options;
	// Generate unique stream ID
	const streamId = `stream_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;
	currentStreamId = streamId;

	// Initialize stream as active in the store
	streamStore.update((s) => {
		s.streams.set(streamId, {
			status: "active",
			lines: [],
			label,
		});
		s.revision++;
	});

	// Start the prompt in the background
	const promptPromise = streamInternal({
		label,
		streamId,
		maxLines: finalOptions?.maxLines,
		hideOnCompletion: finalOptions?.hideOnCompletion,
		submitDelay: finalOptions?.submitDelay,
		showLineNumbers: finalOptions?.showLineNumbers,
		prefixSymbol: finalOptions?.prefixSymbol,
	});

	// Buffer for incomplete lines
	let lineBuffer = "";

	// Create controller object with async methods
	const controller: StreamController = {
		write: async (text: string) => {
			// Append text to buffer
			lineBuffer += text;

			// Split by newlines but keep incomplete line in buffer
			const parts = lineBuffer.split("\n");

			if (parts.length > 1) {
				// We have complete lines
				lineBuffer = parts[parts.length - 1]; // Keep last incomplete part
				const completeLines = parts.slice(0, -1);

				streamStore.update((s) => {
					const currentState = s.streams.get(streamId) || {
						status: "active",
						lines: [],
					};
					s.streams.set(streamId, {
						...currentState,
						lines: [...currentState.lines, ...completeLines],
					});
					s.revision++;
				});
			}
		},
		writeLine: async (text: string) => {
			// Flush any buffered content with this line
			const lineToAdd = lineBuffer + text;
			lineBuffer = "";

			streamStore.update((s) => {
				const currentState = s.streams.get(streamId) || {
					status: "active",
					lines: [],
				};
				s.streams.set(streamId, {
					...currentState,
					lines: [...currentState.lines, lineToAdd],
				});
				s.revision++;
			});
		},
		clear: async () => {
			lineBuffer = "";
			updateStreamState(streamId, { lines: [] });
		},
		setLabel: async (newLabel: string) => {
			updateStreamState(streamId, { label: newLabel });
		},
		complete: async (finalMessage?: string) => {
			// Flush any remaining buffer
			if (lineBuffer) {
				await controller.writeLine(lineBuffer);
			}

			if (finalMessage) {
				await controller.writeLine(finalMessage);
			}

			updateStreamState(streamId, { status: "completed" });
			// Wait for the prompt to complete
			await promptPromise;
		},
		error: async (errorMessage?: string) => {
			// Flush any remaining buffer
			if (lineBuffer) {
				await controller.writeLine(lineBuffer);
			}

			if (errorMessage) {
				await controller.writeLine(errorMessage);
			}

			updateStreamState(streamId, { status: "error" });
			// Wait for the prompt to complete
			await promptPromise;
		},
	};

	// Wait a bit to ensure the component is mounted
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Return controller immediately so user can control it
	return controller;
}
