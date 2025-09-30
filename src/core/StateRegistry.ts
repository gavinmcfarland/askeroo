// Plugin state registry system to allow plugins to register for state updates
// This eliminates hardcoded dependencies from PromptApp

export interface FieldState {
	values: Record<string, any>;
	visited: Set<string>;
	completed: Set<string>;
	properties: Map<string, any>;
	messages: Record<string, string>;
	groupNames: Record<string, string>;
	groupIds: Record<string, string>;
}

export interface GroupState {
	progressive: Set<string>;
	phased: Set<string>;
	static: Set<string>;
	completed: Set<string>;
	order: string[];
	arrowNavigation: Set<string>;
}

export interface PromptAppState {
	fieldState: FieldState;
	groupState: GroupState;
	currentGroup: string | null;
	// Add other state as needed
}

type StateUpdateCallback = (state: PromptAppState) => void;

// Global registry for state update callbacks
let stateUpdateCallbacks: Set<StateUpdateCallback> = new Set();

// Function for plugins to register for state updates
export function registerForStateUpdates(callback: StateUpdateCallback) {
	stateUpdateCallbacks.add(callback);

	// Return unregister function
	return () => {
		stateUpdateCallbacks.delete(callback);
	};
}

// Function for PromptApp to notify all registered plugins of state changes
export function notifyStateUpdate(state: PromptAppState) {
	stateUpdateCallbacks.forEach(callback => {
		try {
			callback(state);
		} catch (error) {
			console.error('Error in plugin state update callback:', error);
		}
	});
}

// Helper to get current registered callback count (for debugging)
export function getRegisteredCallbackCount(): number {
	return stateUpdateCallbacks.size;
}