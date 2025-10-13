import { createPrompt } from "../../core/registry.js";
import { SpinnerDisplay } from "./Spinner.js";
import { spinnerStore } from "./spinner-store.js";
import type { SpinnerOptions, SpinnerController } from "./types.js";

// Re-export types
export type {
	SpinnerLabel,
	SpinnerStatus,
	SpinnerState,
	SpinnerStyle,
} from "./types.js";

// Track the most recent spinner ID
let currentSpinnerId: string | null = null;

// Internal plugin implementation
const spinnerInternal = createPrompt<SpinnerOptions, void>({
	type: "spinner",
	component: SpinnerDisplay,
});

// Function to update spinner state
function updateSpinnerState(
	spinnerId: string,
	status: "idle" | "running" | "paused" | "stopped",
	currentLabel?: string,
	currentStyle?: SpinnerOptions["style"]
) {
	spinnerStore.update((s) => {
		const currentState = s.spinners.get(spinnerId) || { status: "idle" };

		// Merge style with existing style instead of replacing
		const mergedStyle = currentStyle
			? { ...currentState.currentStyle, ...currentStyle }
			: currentState.currentStyle;

		s.spinners.set(spinnerId, {
			status,
			currentLabel:
				currentLabel !== undefined
					? currentLabel
					: currentState.currentLabel,
			currentStyle: mergedStyle,
		});
		s.revision++;
	});
}

// Public API function
export async function spinner(
	label?: string | SpinnerOptions["label"],
	style?: SpinnerOptions["style"]
): Promise<SpinnerController> {
	// Generate unique spinner ID
	const spinnerId = `spinner_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;
	currentSpinnerId = spinnerId;

	// Initialize spinner as idle in the store
	spinnerStore.update((s) => {
		s.spinners.set(spinnerId, { status: "idle", currentStyle: style });
		s.revision++;
	});

	// Start the prompt in the background
	let promptResolve: (() => void) | null = null;
	const promptPromise = spinnerInternal({
		label: label,
		spinnerId: spinnerId,
		style: style,
	});

	// Create controller object with async methods
	const controller: SpinnerController = {
		start: async (text?: string, style?: SpinnerOptions["style"]) => {
			updateSpinnerState(spinnerId, "running", text, style);
		},
		pause: async (text?: string, style?: SpinnerOptions["style"]) => {
			updateSpinnerState(spinnerId, "paused", text, style);
		},
		resume: async (text?: string, style?: SpinnerOptions["style"]) => {
			updateSpinnerState(spinnerId, "running", text, style);
		},
		stop: async (text?: string, style?: SpinnerOptions["style"]) => {
			updateSpinnerState(spinnerId, "stopped", text, style);
			// Wait for the prompt to complete
			await promptPromise;
		},
	};

	// Wait a bit to ensure the component is mounted
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Return controller immediately so user can control it
	return controller;
}
