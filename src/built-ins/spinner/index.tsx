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
	SpinnerSymbol,
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
	label?: string,
	currentStyle?: SpinnerStyle
) {
	spinnerStore.update((s) => {
		const currentState = s.spinners.get(spinnerId) || { status: "idle" };

		// Merge style with existing style instead of replacing
		const mergedStyle = currentStyle
			? { ...currentState.currentStyle, ...currentStyle }
			: currentState.currentStyle;

		// Handle symbol update - if style contains a symbol, update currentSymbol
		const updatedSymbol =
			currentStyle?.symbol !== undefined
				? currentStyle.symbol
				: currentState.currentSymbol;

		s.spinners.set(spinnerId, {
			status,
			currentLabel:
				label !== undefined ? label : currentState.currentLabel,
			currentStyle: mergedStyle,
			currentSymbol: updatedSymbol,
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
	const initialStyle = options?.style;

	// Initialize spinner as idle in the store with grace period active
	spinnerStore.update((s) => {
		s.spinners.set(spinnerId, {
			status: "idle",
			currentStyle: initialStyle,
			currentSymbol: options?.style?.symbol,
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
		hideOnCompletion: options?.hideOnCompletion,
		submitDelay: options?.submitDelay,
		style: options?.style,
	});

	// Create controller object with async methods
	const controller: SpinnerController = {
		start: async (label?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "running", label, style);
		},
		pause: async (label?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "paused", label, style);
		},
		resume: async (label?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "running", label, style);
		},
		stop: async (label?: string, style?: SpinnerStyle) => {
			updateSpinnerState(spinnerId, "stopped", label, style);
			// Wait for the prompt to complete
			await promptPromise;
		},
	};

	// Wait a bit to ensure the component is mounted
	await new Promise((resolve) => setTimeout(resolve, 50));

	// Return controller immediately so user can control it
	return controller;
}
