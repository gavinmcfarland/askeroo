import { createPrompt } from "../../core/registry.js";
import { TasksDisplay } from "./Tasks.js";
import type { Task, TasksOptions } from "./types.js";

// Re-export types
export type { Task, TaskLabel, CompleteOn } from "./types.js";

// Result types for task execution
export interface TaskResult {
	id: string;
	label: string;
	status: "success" | "error" | "warning";
	error?: string;
	warning?: string;
	duration?: number;
	subtasks?: TaskResult[];
}

export interface TasksResult {
	success: boolean;
	totalTasks: number;
	completedTasks: number;
	failedTasks: number;
	warningTasks: number;
	results: TaskResult[];
}

// Custom error class for task warnings
export class TaskWarning extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TaskWarning";
	}
}

// Function to get results from global task state
async function getTaskResults(): Promise<TasksResult> {
	// Import the global state from Tasks.tsx
	const { getGlobalTaskStates, getTaskLabel } = await import("./Tasks.js");
	const globalTaskStates = getGlobalTaskStates();

	const results: TaskResult[] = [];
	let totalTasks = 0;
	let completedTasks = 0;
	let failedTasks = 0;
	let warningTasks = 0;

	// Convert global task states to results
	for (const [taskId, taskState] of globalTaskStates) {
		// Include completed tasks (not idle/running) and top-level tasks, plus dynamic tasks
		if (
			(!taskId.includes(".") || taskId.startsWith("dynamic.")) &&
			["success", "error", "warning"].includes(taskState.status)
		) {
			totalTasks++;

			const result: TaskResult = {
				id: taskId,
				label: getTaskLabel(taskId) || `Task ${taskId}`,
				status: taskState.status as "success" | "error" | "warning",
				error: taskState.error,
				warning: taskState.warning,
			};

			// Count task outcomes
			if (taskState.status === "success") completedTasks++;
			else if (taskState.status === "error") failedTasks++;
			else if (taskState.status === "warning") warningTasks++;

			results.push(result);
		}
	}

	return {
		success: failedTasks === 0,
		totalTasks,
		completedTasks,
		failedTasks,
		warningTasks,
		results,
	};
}

// Internal plugin implementation
const tasksInternal = createPrompt<TasksOptions, TasksResult>({
	type: "tasks",
	component: TasksDisplay,
	// autoSubmit: false (default) - Tasks manage their own submission timing
});

// Public API function with add method and execution mode options
export async function tasks(
	taskList: TasksOptions["tasks"],
	options?: { concurrent?: boolean }
): Promise<TasksResult> {
	await tasksInternal({
		tasks: taskList,
		concurrent: options?.concurrent,
	});

	// Wait for any pending tasks that were added dynamically
	const { waitForPendingTasks } = await import("./Tasks.js");
	await waitForPendingTasks();

	return await getTaskResults();
}

// Sequential execution method
tasks.sequential = async function (
	taskList: TasksOptions["tasks"]
): Promise<TasksResult> {
	return tasks(taskList, { concurrent: false });
};

// Parallel execution method (explicit, though this is default behavior)
tasks.parallel = async function (
	taskList: TasksOptions["tasks"]
): Promise<TasksResult> {
	return tasks(taskList, { concurrent: true });
};

// Standalone function for adding dynamic tasks
export async function addTask(task: Task): Promise<void> {
	const { addDynamicTask, hasExistingTasks } = await import("./Tasks.js");

	// Only add task if some already exist, otherwise silently fail
	if (!hasExistingTasks()) {
		return;
	}

	return addDynamicTask(task);
}

// Function for adding multiple dynamic tasks
export async function addTasks(
	taskList: Task[],
	options?: { concurrent?: boolean }
): Promise<void> {
	const { addDynamicTask, hasExistingTasks } = await import("./Tasks.js");

	// Only add tasks if some already exist, otherwise silently fail
	if (!hasExistingTasks()) {
		return;
	}

	if (options?.concurrent === false) {
		// Sequential execution
		for (const task of taskList) {
			await addDynamicTask(task);
		}
	} else {
		// Parallel execution (default)
		await Promise.allSettled(taskList.map((task) => addDynamicTask(task)));
	}
}

// Add the dynamic task addition method to the tasks function
tasks.add = addTasks;

// NOTE: Task state updates now use the generic PromptStateContext system
// No initialization needed - prompts automatically get reactive updates
// See src/core/plugin-state-context.tsx for details
