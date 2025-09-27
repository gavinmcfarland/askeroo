import { createPlugin } from '../../registry.js';
import { TasksDisplay, TasksOptions } from './Tasks.js';

// Re-export types
export type { Task, TaskLabel } from './Tasks.js';

// Re-export functions
export { addTask, hasIncompleteTasks } from './Tasks.js';

// Result types for task execution
export interface TaskResult {
	id: string;
	label: string;
	status: 'done' | 'error' | 'warning';
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
		this.name = 'TaskWarning';
	}
}

// Function to get results from global task state
async function getTaskResults(): Promise<TasksResult> {
	// Import the global state from Tasks.tsx
	const { getGlobalTaskStates, getTaskLabel } = await import('./Tasks.js');
	const globalTaskStates = getGlobalTaskStates();

	const results: TaskResult[] = [];
	let totalTasks = 0;
	let completedTasks = 0;
	let failedTasks = 0;
	let warningTasks = 0;

	// Convert global task states to results
	for (const [taskId, taskState] of globalTaskStates) {
		// Only include completed tasks (not idle/running) and top-level tasks
		if (!taskId.includes('.') && ['done', 'error', 'warning'].includes(taskState.status)) {
			totalTasks++;

			const result: TaskResult = {
				id: taskId,
				label: getTaskLabel(taskId) || `Task ${taskId}`,
				status: taskState.status as 'done' | 'error' | 'warning',
				error: taskState.error,
				warning: taskState.warning,
			};

			// Count task outcomes
			if (taskState.status === 'done') completedTasks++;
			else if (taskState.status === 'error') failedTasks++;
			else if (taskState.status === 'warning') warningTasks++;

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
const tasksInternal = createPlugin<TasksOptions, TasksResult>({
	type: 'tasks',
	component: TasksDisplay,
	interactive: false, // Tasks don't require user interaction

	// The prompt logic - return the results after execution
	prompt(opts: TasksOptions) {
		return opts;
	},
});

// Public API function
export async function tasks(taskList: TasksOptions['tasks']): Promise<TasksResult> {
	await tasksInternal({ tasks: taskList });
	return await getTaskResults();
}