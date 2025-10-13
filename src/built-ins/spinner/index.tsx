import { createPrompt } from "../../core/registry.js";
import { SpinnerDisplay } from "./Spinner.js";
import { spinnerStore } from "./spinner-store.js";
import type { SpinnerOptions, SpinnerController } from "./types.js";

// Re-export types
export type { SpinnerLabel, SpinnerStatus, SpinnerState } from "./types.js";

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
	currentLabel?: string
) {
	spinnerStore.update((s) => {
		const currentState = s.spinners.get(spinnerId) || { status: "idle" };
		s.spinners.set(spinnerId, {
			status,
			currentLabel:
				currentLabel !== undefined
					? currentLabel
					: currentState.currentLabel,
		});
		s.revision++;
	});
}

// Public API function
export async function spinner(
	label?: string | SpinnerOptions["label"]
): Promise<SpinnerController> {
	// Generate unique spinner ID
	const spinnerId = `spinner_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;
	currentSpinnerId = spinnerId;

	// Initialize spinner as idle in the store
	spinnerStore.update((s) => {
		s.spinners.set(spinnerId, { status: "idle" });
		s.revision++;
	});

	// Start the prompt in the background
	let promptResolve: (() => void) | null = null;
	const promptPromise = spinnerInternal({
		label: label,
		spinnerId: spinnerId,
	});

	// Create controller object with async methods
	const controller: SpinnerController = {
		start: async (text?: string) => {
			updateSpinnerState(spinnerId, "running", text);
		},
		pause: async (text?: string) => {
			updateSpinnerState(spinnerId, "paused", text);
		},
		resume: async (text?: string) => {
			updateSpinnerState(spinnerId, "running", text);
		},
		stop: async (text?: string) => {
			updateSpinnerState(spinnerId, "stopped", text);
			// Wait for the prompt to complete
			await promptPromise;
		},
	};

	// Wait a bit to ensure the component is mounted
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Return controller immediately so user can control it
	return controller;
}
