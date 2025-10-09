// Task store to manage dynamic tasks using the store factory pattern
// Uses createStore for automatic reactive updates

import { createStore } from "../../core/store.js";

export interface TaskStoreState {
	taskListDynamicTasks: Map<string, Array<any>>;
	taskListStates: Map<string, Map<string, any>>;
	allTaskStates: Map<string, Map<string, any>>;
	pendingTaskExecutors: Map<string, () => Promise<void>>;
	revision: number; // Used to trigger re-renders when Maps change
}

// Create the task store with all state in one place
export const taskStore = createStore<TaskStoreState>({
	taskListDynamicTasks: new Map(),
	taskListStates: new Map(),
	allTaskStates: new Map(),
	pendingTaskExecutors: new Map(),
	revision: 0,
});

// Check if any task lists exist (for the silently fail check)
export function hasAnyTaskLists(): boolean {
	return taskStore.get().taskListDynamicTasks.size > 0;
}

// Clear all task data (for testing/reset)
export function clearTaskStore() {
	taskStore.reset();
}
