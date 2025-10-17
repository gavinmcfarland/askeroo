import { taskInternal } from "./Task.js";
import type { Task, TasksOptions } from "./types.js";

// Re-export types
export type {
	Task,
	TaskLabel,
	CompleteOn,
	TaskStatus,
	TaskState,
	TasksOptions,
} from "./types.js";

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

/**
 * Execute a list of tasks
 *
 * NEW ARCHITECTURE:
 * Each task becomes a node in the prompt tree, allowing child prompts
 * (stream, spinner, note) to render inline within the task.
 *
 * @param taskList - Array of tasks to execute
 * @param options - Execution options (concurrent, etc.)
 */
export async function tasks(
	taskList: Task[],
	options?: { concurrent?: boolean }
): Promise<TasksResult> {
	const results: TasksResult = {
		success: true,
		totalTasks: taskList.length,
		completedTasks: 0,
		failedTasks: 0,
		warningTasks: 0,
		results: [],
	};

	// Helper to execute a single task
	const executeTask = async (task: Task, index: number) => {
		const taskId = `task_${Date.now()}_${index}`;
		const startTime = Date.now();

		try {
			// Each task becomes a prompt node in the tree
			await taskInternal({
				...task,
				taskId,
			});

			results.completedTasks++;
			results.results.push({
				id: taskId,
				label: typeof task.label === "string" ? task.label : "Task",
				status: "success",
				duration: Date.now() - startTime,
			});
		} catch (error) {
			if (error instanceof TaskWarning) {
				results.warningTasks++;
				results.results.push({
					id: taskId,
					label: typeof task.label === "string" ? task.label : "Task",
					status: "warning",
					warning: error.message,
					duration: Date.now() - startTime,
				});
			} else {
				results.failedTasks++;
				results.success = false;
				results.results.push({
					id: taskId,
					label: typeof task.label === "string" ? task.label : "Task",
					status: "error",
					error:
						error instanceof Error ? error.message : String(error),
					duration: Date.now() - startTime,
				});

				// Rethrow if continueOnError is false
				if (!task.continueOnError) {
					throw error;
				}
			}
		}
	};

	// Execute tasks based on concurrent option
	if (options?.concurrent) {
		// Run all tasks concurrently
		const promises = taskList.map((task, index) =>
			executeTask(task, index)
		);
		await Promise.allSettled(promises);
	} else {
		// Run tasks sequentially (default)
		for (let i = 0; i < taskList.length; i++) {
			await executeTask(taskList[i], i);
		}
	}

	return results;
}

// Sequential execution method
tasks.sequential = async function (taskList: Task[]): Promise<TasksResult> {
	return tasks(taskList, { concurrent: false });
};

// Parallel execution method
tasks.parallel = async function (taskList: Task[]): Promise<TasksResult> {
	return tasks(taskList, { concurrent: true });
};

// Dynamic task addition (deprecated in new architecture)
// In the new architecture, just call tasks() again with new tasks
tasks.add = async function (taskOrList: Task | Task[]): Promise<void> {
	const taskList = Array.isArray(taskOrList) ? taskOrList : [taskOrList];
	await tasks(taskList);
};
