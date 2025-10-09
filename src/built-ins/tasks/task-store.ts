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

// Add a dynamic task to a specific task list
export function addDynamicTaskToList(taskListId: string, task: any): string {
	const taskId = `${taskListId}_dynamic_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;

	taskStore.update((state) => {
		// Get existing tasks for this list
		const existingTasks = state.taskListDynamicTasks.get(taskListId) || [];
		const updatedTasks = [...existingTasks, task];

		// Update the store
		state.taskListDynamicTasks.set(taskListId, updatedTasks);

		// Initialize task state
		const existingStates =
			state.taskListStates.get(taskListId) || new Map();
		existingStates.set(taskId, { status: "idle" });
		state.taskListStates.set(taskListId, existingStates);

		// Increment revision to trigger re-renders
		state.revision += 1;
	});

	return taskId;
}

// Update task state (works for both dynamic and regular tasks)
export function updateTaskState(
	taskListId: string,
	taskId: string,
	state: any
) {
	taskStore.update((store) => {
		// Update in dynamic task store if it's a dynamic task
		if (taskId.includes("_dynamic_")) {
			const existingStates =
				store.taskListStates.get(taskListId) || new Map();
			const currentState = existingStates.get(taskId) || {
				status: "idle",
			};
			existingStates.set(taskId, { ...currentState, ...state });
			store.taskListStates.set(taskListId, existingStates);
		}

		// Also update in all task states for comprehensive tracking
		// IMPORTANT: Create a new Map to ensure reference changes for React re-renders
		const oldListStates = store.allTaskStates.get(taskListId) || new Map();
		const currentState = oldListStates.get(taskId) || { status: "idle" };
		const newListStates = new Map(oldListStates); // Create new Map from old one
		newListStates.set(taskId, { ...currentState, ...state });
		store.allTaskStates.set(taskListId, newListStates);

		// Increment revision to trigger re-renders
		store.revision += 1;
	});
}

// Get dynamic tasks for a task list
export function getDynamicTasksForList(taskListId: string): Array<any> {
	return taskStore.get().taskListDynamicTasks.get(taskListId) || [];
}

// Get task states for a task list (dynamic tasks only)
export function getTaskStatesForList(taskListId: string): Map<string, any> {
	return taskStore.get().taskListStates.get(taskListId) || new Map();
}

// Get all task states for a task list
export function getAllTaskStatesForList(taskListId: string): Map<string, any> {
	return taskStore.get().allTaskStates.get(taskListId) || new Map();
}

// Get all completed dynamic tasks from all task lists
export function getAllCompletedDynamicTasks(): Array<{
	taskListId: string;
	taskId: string;
	task: any;
	state: any;
}> {
	const completedTasks: Array<{
		taskListId: string;
		taskId: string;
		task: any;
		state: any;
	}> = [];

	const store = taskStore.get();
	for (const [taskListId, tasks] of store.taskListDynamicTasks) {
		const states = store.taskListStates.get(taskListId) || new Map();
		tasks.forEach((task, index) => {
			// Find the corresponding task ID in states
			for (const [taskId, state] of states) {
				if (
					state &&
					["success", "error", "warning"].includes(state.status)
				) {
					completedTasks.push({ taskListId, taskId, task, state });
				}
			}
		});
	}

	return completedTasks;
}

// Get all completed regular tasks from all task lists
export function getAllCompletedRegularTasks(): Array<{
	taskListId: string;
	taskId: string;
	state: any;
}> {
	const completedTasks: Array<{
		taskListId: string;
		taskId: string;
		state: any;
	}> = [];

	const store = taskStore.get();
	for (const [taskListId, taskStates] of store.allTaskStates) {
		for (const [taskId, state] of taskStates) {
			// Only include regular tasks (not dynamic) that are completed
			if (
				!taskId.includes("_dynamic_") &&
				state &&
				["success", "error", "warning"].includes(state.status)
			) {
				completedTasks.push({ taskListId, taskId, state });
			}
		}
	}

	return completedTasks;
}

// Check if any task lists exist (for the silently fail check)
export function hasAnyTaskLists(): boolean {
	return taskStore.get().taskListDynamicTasks.size > 0;
}

// Register a task executor (to be called later by polling mechanism)
export function registerTaskExecutor(
	taskId: string,
	executor: () => Promise<void>
) {
	taskStore.update((state) => {
		state.pendingTaskExecutors.set(taskId, executor);
		state.revision += 1;
	});
}

// Start a pending task (called by polling after idle state is rendered)
export function startPendingTask(taskId: string) {
	const executor = taskStore.get().pendingTaskExecutors.get(taskId);
	if (executor) {
		taskStore.update((state) => {
			state.pendingTaskExecutors.delete(taskId);
			state.revision += 1;
		});
		executor(); // Start execution
	}
}

// Check if a task is pending execution
export function isTaskPending(taskId: string): boolean {
	return taskStore.get().pendingTaskExecutors.has(taskId);
}

// Get all pending task IDs for a task list
export function getPendingTaskIds(taskListId: string): string[] {
	const pendingIds: string[] = [];
	const store = taskStore.get();
	for (const taskId of store.pendingTaskExecutors.keys()) {
		if (taskId.startsWith(taskListId)) {
			pendingIds.push(taskId);
		}
	}
	return pendingIds;
}

// Clear all task data (for testing/reset)
export function clearTaskStore() {
	taskStore.reset();
}
