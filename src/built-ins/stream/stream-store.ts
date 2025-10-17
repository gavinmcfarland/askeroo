// Stream store to manage streaming output state using the store factory pattern
// Uses createStore for automatic reactive updates

import { createStore } from "../../core/store.js";
import type { StreamState } from "./types.js";

export interface StreamStoreState {
	streams: Map<string, StreamState>;
	revision: number; // Used to trigger re-renders when Maps change
}

// Create the stream store with all state in one place
export const streamStore = createStore<StreamStoreState>({
	streams: new Map(),
	revision: 0,
});

// Clear all stream data (for testing/reset)
export function clearStreamStore() {
	streamStore.reset();
}
