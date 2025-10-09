// Task store to manage dynamic tasks using the generic prompt state system
// Uses PromptStateContext for reactive updates instead of polling

import { notifyExternalStateChange } from "../../core/plugin-state-context.js";

export interface TaskStoreState {
	taskListDynamicTasks: Map<string, Array<any>>;
	taskListStates: Map<string, Map<string, any>>;
}

// Global store for task state
let globalTaskStore: TaskStoreState = {
	taskListDynamicTasks: new Map(),
	taskListStates: new Map(),
};

// Store all task list states (including regular tasks, not just dynamic)
let allTaskStates: Map<string, Map<string, any>> = new Map();

// Store pending task executors (functions that will execute the task)
// These are stored when task is added, but only executed after UI picks up the idle state
let pendingTaskExecutors: Map<string, () => Promise<void>> = new Map();

// Add a dynamic task to a specific task list
export function addDynamicTaskToList(taskListId: string, task: any): string {
	const taskId = `${taskListId}_dynamic_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;

	// Get existing tasks for this list
	const existingTasks =
		globalTaskStore.taskListDynamicTasks.get(taskListId) || [];
	const updatedTasks = [...existingTasks, task];

	// Update the store
	globalTaskStore.taskListDynamicTasks.set(taskListId, updatedTasks);

	// Initialize task state
	const existingStates =
		globalTaskStore.taskListStates.get(taskListId) || new Map();
	existingStates.set(taskId, { status: "idle" });
	globalTaskStore.taskListStates.set(taskListId, existingStates);

	// Notify all subscribed prompts to update via PromptStateContext
	// useExternalState handles caching automatically - no manual cache invalidation needed!
	notifyExternalStateChange();

	return taskId;
}

// Update task state (works for both dynamic and regular tasks)
export function updateTaskState(
	taskListId: string,
	taskId: string,
	state: any
) {
	// Update in dynamic task store if it's a dynamic task
	if (taskId.includes("_dynamic_")) {
		const existingStates =
			globalTaskStore.taskListStates.get(taskListId) || new Map();
		const currentState = existingStates.get(taskId) || { status: "idle" };
		existingStates.set(taskId, { ...currentState, ...state });
		globalTaskStore.taskListStates.set(taskListId, existingStates);
	}

	// Also update in all task states for comprehensive tracking
	// IMPORTANT: Create a new Map to ensure reference changes for React re-renders
	const oldListStates = allTaskStates.get(taskListId) || new Map();
	const currentState = oldListStates.get(taskId) || { status: "idle" };
	const newListStates = new Map(oldListStates); // Create new Map from old one
	newListStates.set(taskId, { ...currentState, ...state });
	allTaskStates.set(taskListId, newListStates);

	// Notify all subscribed prompts to update via PromptStateContext
	// useExternalState handles caching automatically - no manual cache invalidation needed!
	notifyExternalStateChange();
}

// Get dynamic tasks for a task list
// No caching needed - useExternalState handles it automatically!
export function getDynamicTasksForList(taskListId: string): Array<any> {
	return globalTaskStore.taskListDynamicTasks.get(taskListId) || [];
}

// Get task states for a task list (dynamic tasks only)
export function getTaskStatesForList(taskListId: string): Map<string, any> {
	return globalTaskStore.taskListStates.get(taskListId) || new Map();
}

// Get all task states for a task list
// No caching needed - useExternalState handles it automatically!
export function getAllTaskStatesForList(taskListId: string): Map<string, any> {
	return allTaskStates.get(taskListId) || new Map();
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

	for (const [taskListId, tasks] of globalTaskStore.taskListDynamicTasks) {
		const states =
			globalTaskStore.taskListStates.get(taskListId) || new Map();
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

	for (const [taskListId, taskStates] of allTaskStates) {
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
	return globalTaskStore.taskListDynamicTasks.size > 0;
}

// Register a task executor (to be called later by polling mechanism)
export function registerTaskExecutor(
	taskId: string,
	executor: () => Promise<void>
) {
	pendingTaskExecutors.set(taskId, executor);
}

// Start a pending task (called by polling after idle state is rendered)
export function startPendingTask(taskId: string) {
	const executor = pendingTaskExecutors.get(taskId);
	if (executor) {
		pendingTaskExecutors.delete(taskId);
		executor(); // Start execution
	}
}

// Check if a task is pending execution
export function isTaskPending(taskId: string): boolean {
	return pendingTaskExecutors.has(taskId);
}

// Get all pending task IDs for a task list
export function getPendingTaskIds(taskListId: string): string[] {
	const pendingIds: string[] = [];
	for (const taskId of pendingTaskExecutors.keys()) {
		if (taskId.startsWith(taskListId)) {
			pendingIds.push(taskId);
		}
	}
	return pendingIds;
}

// Clear all task data (for testing/reset)
export function clearTaskStore() {
	globalTaskStore.taskListDynamicTasks.clear();
	globalTaskStore.taskListStates.clear();
	pendingTaskExecutors.clear();

	// Notify all subscribed prompts to update via PromptStateContext
	// useExternalState handles caching automatically - no manual cache clearing needed!
	notifyExternalStateChange();
}
