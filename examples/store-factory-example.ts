/**
 * Example: Using the Store Factory Pattern
 *
 * This demonstrates the modern, ergonomic approach to managing external state
 * with createStore.
 */

import { createStore } from "../src/core/store.js";
import { createPrompt } from "../src/core/registry.js";

// Example 1: Simple Task Store
// ============================

interface Task {
	id: string;
	title: string;
	status: "idle" | "running" | "success" | "error";
}

// Create a typed store (one line!)
export const taskStore = createStore({
	tasks: [] as Task[],
	activeTaskId: null as string | null,
});

// Update anywhere - notifications are automatic!
export function addTask(task: Task) {
	taskStore.update((state) => {
		state.tasks.push(task);
	});
	// No manual notify call needed! ✨
}

export function setActiveTask(taskId: string | null) {
	taskStore.update((state) => {
		state.activeTaskId = taskId;
	});
}

export function updateTaskStatus(taskId: string, status: Task["status"]) {
	taskStore.update((state) => {
		const task = state.tasks.find((t) => t.id === taskId);
		if (task) {
			task.status = status;
		}
	});
}

export function clearTasks() {
	taskStore.reset();
}

// Use in components - clean and simple
export const TasksDisplay = createPrompt({
	type: "tasksDisplay",
	component: ({ node, options, events }: any) => {
		// Automatically subscribes and re-renders on changes!
		const { tasks, activeTaskId } = taskStore.use();

		return null; // Simplified for example
	},
});

// Example 2: Multiple Stores with Cross-Store Operations
// ========================================================

interface TaskList {
	id: string;
	name: string;
	taskIds: string[];
}

export const taskListStore = createStore({
	lists: new Map<string, TaskList>(),
	activeListId: null as string | null,
});

export const taskDataStore = createStore({
	tasks: new Map<string, Task>(),
});

// Cross-store operations
export function deleteTaskList(listId: string) {
	const list = taskListStore.get().lists.get(listId);
	if (!list) return;

	// Update multiple stores in one operation
	taskListStore.update((state) => {
		state.lists.delete(listId);
		if (state.activeListId === listId) {
			state.activeListId = null;
		}
	});

	taskDataStore.update((state) => {
		// Remove all tasks in this list
		for (const taskId of list.taskIds) {
			state.tasks.delete(taskId);
		}
	});
}

// Example 3: Direct State Access (no subscription)
// =================================================

export function getTaskById(taskId: string): Task | undefined {
	// Use .get() for direct access without subscribing
	return taskStore.get().tasks.find((t) => t.id === taskId);
}

export function getAllActiveTasks(): Task[] {
	const { tasks } = taskStore.get();
	return tasks.filter((t) => t.status === "running");
}

// Example 4: Manual Subscription (advanced)
// ==========================================

export function setupTaskLogger() {
	// Subscribe manually to log all changes
	const unsubscribe = taskStore.subscribe(() => {
		const state = taskStore.get();
		console.log("Tasks changed:", {
			count: state.tasks.length,
			active: state.activeTaskId,
		});
	});

	// Return cleanup function
	return unsubscribe;
}

console.log("Store factory example loaded successfully!");
console.log("Available functions:", {
	addTask: typeof addTask,
	setActiveTask: typeof setActiveTask,
	updateTaskStatus: typeof updateTaskStatus,
	clearTasks: typeof clearTasks,
	deleteTaskList: typeof deleteTaskList,
	getTaskById: typeof getTaskById,
	getAllActiveTasks: typeof getAllActiveTasks,
	setupTaskLogger: typeof setupTaskLogger,
});
