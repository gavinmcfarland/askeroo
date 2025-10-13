import { createPrompt } from "../../core/registry.js";
import { SpinnerDisplay } from "./Spinner.js";
import { spinnerStore } from "./spinner-store.js";
import type {
	SpinnerOptions,
	SpinnerController,
	SpinnerStyle,
} from "./types.js";

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
	currentStyle?: SpinnerStyle
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
			gracePeriodActive: false, // Clear grace period when state changes
		});
		s.revision++;
	});
}

// Public API function
export async function spinner(
	label?: string | SpinnerOptions["label"],
	options?: Omit<SpinnerOptions, "label" | "spinnerId">
): Promise<SpinnerController> {
	// Generate unique spinner ID
	const spinnerId = `spinner_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;
	currentSpinnerId = spinnerId;

	// Extract style from options
	const initialStyle = options
		? {
				color: options.color,
				bgColor: options.bgColor,
				dim: options.dim,
		  }
		: undefined;

	// Initialize spinner as idle in the store with grace period active
	spinnerStore.update((s) => {
		s.spinners.set(spinnerId, {
			status: "idle",
			currentStyle: initialStyle,
			gracePeriodActive: true, // Initially in grace period to avoid symbol flash
		});
		s.revision++;
	});

	// End grace period after 100ms (allows start() to be called without showing idle symbol)
	setTimeout(() => {
		spinnerStore.update((s) => {
			const spinner = s.spinners.get(spinnerId);
			if (spinner?.gracePeriodActive) {
				s.spinners.set(spinnerId, {
					...spinner,
					gracePeriodActive: false,
				});
				s.revision++;
			}
		});
	}, 100);

	// Start the prompt in the background
	let promptResolve: (() => void) | null = null;
	const promptPromise = spinnerInternal({
		label: label,
		spinnerId: spinnerId,
		color: options?.color,
		bgColor: options?.bgColor,
		dim: options?.dim,
		hideOnCompletion: options?.hideOnCompletion,
		submitDelay: options?.submitDelay,
	});

	// Create controller object with async methods
	const controller: SpinnerController = {
		start: async (text?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "running", text, style);
		},
		pause: async (text?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "paused", text, style);
		},
		resume: async (text?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "running", text, style);
		},
		stop: async (text?: string, style?: SpinnerStyle) => {
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
