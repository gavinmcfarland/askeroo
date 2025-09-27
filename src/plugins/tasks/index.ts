import { createPlugin } from '../../registry.js';
import { TasksDisplay, TasksOptions } from './Tasks.js';

// Re-export types
export type { Task, TaskLabel } from './Tasks.js';

// Custom error class for task warnings
export class TaskWarning extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TaskWarning';
	}
}

// Internal plugin implementation
const tasksInternal = createPlugin<TasksOptions, void>({
	type: 'tasks',
	component: TasksDisplay,
	interactive: false, // Tasks don't require user interaction

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: TasksOptions) {
		return opts;
	},
});

// Public API function
export function tasks(taskList: TasksOptions['tasks']): Promise<void> {
	return tasksInternal({ tasks: taskList });
}