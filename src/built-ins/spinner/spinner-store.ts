// Spinner store to manage spinner state using the store factory pattern
// Uses createStore for automatic reactive updates

import { createStore } from "../../core/store.js";
import type { SpinnerState } from "./types.js";

export interface SpinnerStoreState {
	spinners: Map<string, SpinnerState>;
	revision: number; // Used to trigger re-renders when Maps change
}

// Create the spinner store with all state in one place
export const spinnerStore = createStore<SpinnerStoreState>({
	spinners: new Map(),
	revision: 0,
});

// Clear all spinner data (for testing/reset)
export function clearSpinnerStore() {
	spinnerStore.reset();
}
