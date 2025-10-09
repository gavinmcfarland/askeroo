import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TaskWarning } from "./index.js";
import { PluginComponentProps } from "../../types/index.js";

export interface TaskLabel {
	idle?: string;
	running?: string;
	success?: string;
	error?: string;
}

export type CompleteOn = "children" | "self" | "either";

export interface Task {
	label: string | TaskLabel;
	action?: () => Promise<void>;
	tasks?: Task[];
	concurrent?: boolean;
	continueOnError?: boolean;
	completeOn?: CompleteOn;
}

/**
 * User-provided options for the tasks plugin
 */
export interface TasksOptions {
	tasks: Task[];
	concurrent?: boolean;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// meta?
}

type TaskStatus = "idle" | "running" | "success" | "error" | "warning";

interface TaskState {
	status: TaskStatus;
	error?: string;
	warning?: string;
}

import { taskStore, hasAnyTaskLists } from "./task-store.js";

// Track active task lists for tasks.add() functionality
let activeTaskLists: Set<string> = new Set();
let mostRecentTaskListId: string | null = null;

// Function to end a task list
function endTaskList(taskListId: string) {
	activeTaskLists.delete(taskListId);
	if (mostRecentTaskListId === taskListId) {
		// Find the most recent active task list, or set to null if none
		const activeLists = [...activeTaskLists];
		mostRecentTaskListId =
			activeLists.length > 0 ? activeLists[activeLists.length - 1] : null;
	}
}

// Export functions for accessing global state
export function getGlobalTaskStates(): Map<string, TaskState> {
	// This function is still used by the results generation, but now we need to collect
	// states from all task lists. For now, return empty map since results will be handled differently
	return new Map();
}

// Function to check if any tasks exist (initial tasks or dynamic tasks)
export function hasExistingTasks(): boolean {
	return mostRecentTaskListId !== null || hasAnyTaskLists();
}

export function getTaskLabel(taskId: string): string | undefined {
	// This function is used by the results generation, but with the new centralized approach,
	// task labels will be handled differently. For now, return a simple label
	return `Task ${taskId}`;
}

// Function to add a task dynamically
export function addDynamicTask(task: Task): Promise<void> {
	if (!mostRecentTaskListId) {
		return Promise.resolve(); // Silently fail if no active task list
	}

	const taskListId = mostRecentTaskListId;
	const taskId = `${taskListId}_dynamic_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;

	// Create executor and promise
	const taskPromise = new Promise<void>((resolve, reject) => {
		const executor = async () => {
			try {
				// Update to running
				taskStore.update((store) => {
					const states =
						store.allTaskStates.get(taskListId) || new Map();
					const newStates = new Map(states);
					newStates.set(taskId, { status: "running" });
					store.allTaskStates.set(taskListId, newStates);

					const dynamicStates =
						store.taskListStates.get(taskListId) || new Map();
					dynamicStates.set(taskId, { status: "running" });
					store.taskListStates.set(taskListId, dynamicStates);

					store.revision += 1;
				});

				if (task.action) {
					await task.action();
				}

				// Update to success
				taskStore.update((store) => {
					const states =
						store.allTaskStates.get(taskListId) || new Map();
					const newStates = new Map(states);
					newStates.set(taskId, { status: "success" });
					store.allTaskStates.set(taskListId, newStates);

					const dynamicStates =
						store.taskListStates.get(taskListId) || new Map();
					dynamicStates.set(taskId, { status: "success" });
					store.taskListStates.set(taskListId, dynamicStates);

					store.revision += 1;
				});
				resolve();
			} catch (error) {
				if (error instanceof TaskWarning) {
					taskStore.update((store) => {
						const states =
							store.allTaskStates.get(taskListId) || new Map();
						const newStates = new Map(states);
						newStates.set(taskId, {
							status: "warning",
							warning: error.message,
						});
						store.allTaskStates.set(taskListId, newStates);

						const dynamicStates =
							store.taskListStates.get(taskListId) || new Map();
						dynamicStates.set(taskId, {
							status: "warning",
							warning: error.message,
						});
						store.taskListStates.set(taskListId, dynamicStates);

						store.revision += 1;
					});
					resolve();
				} else {
					taskStore.update((store) => {
						const states =
							store.allTaskStates.get(taskListId) || new Map();
						const newStates = new Map(states);
						newStates.set(taskId, {
							status: "error",
							error:
								error instanceof Error
									? error.message
									: String(error),
						});
						store.allTaskStates.set(taskListId, newStates);

						const dynamicStates =
							store.taskListStates.get(taskListId) || new Map();
						dynamicStates.set(taskId, {
							status: "error",
							error:
								error instanceof Error
									? error.message
									: String(error),
						});
						store.taskListStates.set(taskListId, dynamicStates);

						store.revision += 1;
					});
					reject(error);
				}
			}
		};

		// Add task to store with idle state
		taskStore.update((store) => {
			const tasks = store.taskListDynamicTasks.get(taskListId) || [];
			store.taskListDynamicTasks.set(taskListId, [...tasks, task]);

			const states = store.allTaskStates.get(taskListId) || new Map();
			const newStates = new Map(states);
			newStates.set(taskId, { status: "idle" });
			store.allTaskStates.set(taskListId, newStates);

			const dynamicStates =
				store.taskListStates.get(taskListId) || new Map();
			dynamicStates.set(taskId, { status: "idle" });
			store.taskListStates.set(taskListId, dynamicStates);

			// Register executor
			store.pendingTaskExecutors.set(taskId, executor);

			store.revision += 1;
		});

		// Fallback: start if component doesn't pick it up
		setTimeout(() => {
			if (taskStore.get().pendingTaskExecutors.has(taskId)) {
				taskStore.update((store) => {
					store.pendingTaskExecutors.delete(taskId);
					store.revision += 1;
				});
				executor();
			}
		}, 500);
	});

	return taskPromise;
}

// Function to wait for all pending tasks to complete
export async function waitForPendingTasks(): Promise<void> {
	return new Promise((resolve) => {
		let completionTimeout: NodeJS.Timeout | null = null;

		// Check if all tasks are complete
		const checkCompletion = () => {
			const store = taskStore.get();
			let hasRunningTasks = false;

			// Check if any tasks are still running or idle across all task lists
			for (const taskStates of store.allTaskStates.values()) {
				for (const state of taskStates.values()) {
					if (state.status === "idle" || state.status === "running") {
						hasRunningTasks = true;
						break;
					}
				}
				if (hasRunningTasks) break;
			}

			return !hasRunningTasks;
		};

		// Handle completion with debounce to allow for tasks.add() calls
		const handleCompletion = () => {
			// Clear any existing timeout
			if (completionTimeout) {
				clearTimeout(completionTimeout);
			}

			// Wait a bit to see if new tasks are added
			completionTimeout = setTimeout(() => {
				// Re-check completion after delay
				if (checkCompletion()) {
					unsubscribe();
					resolve();
				}
				// If not complete anymore, the subscription will catch the next completion
			}, 100); // 100ms grace period for tasks.add() calls
		};

		// Subscribe to store updates and check on each change
		const unsubscribe = taskStore.subscribe(() => {
			if (checkCompletion()) {
				handleCompletion();
			} else {
				// Tasks are running again, clear the timeout
				if (completionTimeout) {
					clearTimeout(completionTimeout);
					completionTimeout = null;
				}
			}
		});

		// Initial check
		if (checkCompletion()) {
			handleCompletion();
		}
	});
}

// Main component for the plugin
export const TasksDisplay = ({
	node,
	options,
	events,
}: {
	node: any;
	options: TasksOptions;
	events: any;
}) => {
	const [isExecuting, setIsExecuting] = useState(false);
	const [spinnerFrame, setSpinnerFrame] = useState(0);
	// Use a stable taskListId based on task content to enable state persistence
	const [taskListId] = useState(() => {
		// Create a deterministic ID based on task structure
		const taskHash = JSON.stringify(
			options.tasks.map((t: Task) => ({
				label: t.label,
				concurrent: t.concurrent,
			}))
		);
		const hash = taskHash.split("").reduce((a: number, b: string) => {
			a = (a << 5) - a + b.charCodeAt(0);
			return a & a;
		}, 0);
		return `tasklist_${Math.abs(hash)}`;
	});

	// Subscribe to the task store - auto-updates on any store change
	const store = taskStore.use();

	// Extract data for this task list (no useMemo needed - store already handles caching)
	const taskStates = store.allTaskStates.get(taskListId) || new Map();
	const dynamicTasks = store.taskListDynamicTasks.get(taskListId) || [];
	const pendingExecutors = store.pendingTaskExecutors;

	// Register this task list as active
	useEffect(() => {
		activeTaskLists.add(taskListId);
		mostRecentTaskListId = taskListId;

		return () => {
			endTaskList(taskListId);
		};
	}, [taskListId]);

	// Check for pending tasks and start them after they've been rendered
	// This ensures the idle state is visible before execution begins
	useEffect(() => {
		// Find pending tasks for this task list
		const pendingTaskIds: string[] = [];
		for (const taskId of pendingExecutors.keys()) {
			if (taskId.startsWith(taskListId)) {
				pendingTaskIds.push(taskId);
			}
		}

		if (pendingTaskIds.length > 0) {
			const timeoutId = setTimeout(() => {
				pendingTaskIds.forEach((taskId) => {
					const executor = taskStore
						.get()
						.pendingTaskExecutors.get(taskId);
					if (executor) {
						taskStore.update((store) => {
							store.pendingTaskExecutors.delete(taskId);
							store.revision += 1;
						});
						executor();
					}
				});
			}, 400);

			return () => clearTimeout(timeoutId);
		}
	}, [pendingExecutors, taskListId]);

	// Animated spinner frames
	const spinnerFrames = ["⠂", "-", "–", "—", "–", "-"];

	// Block all input during task execution to prevent escape sequences from showing
	useInput(
		(_input, _key) => {
			// Consume and discard all input during execution to prevent it from appearing on screen
			if (isExecuting) {
				return; // Silently consume all input
			}
		},
		{
			// Only register input listener when tasks are executing
			// This prevents memory leaks from accumulating event listeners
			isActive: isExecuting,
		}
	);

	// Animate spinner only when tasks are running
	useEffect(() => {
		// Check if any tasks are currently running
		const hasRunningTasks = [...taskStates.values()].some(
			(state) => state.status === "running"
		);

		if (!hasRunningTasks) {
			return; // Don't start animation if no tasks are running
		}

		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 150);

		return () => clearInterval(interval);
	}, [taskStates]);

	const getTaskId = (_task: Task, index: number, parentId = ""): string => {
		return `${taskListId}_${parentId}${index}`;
	};

	const getLabel = (task: Task, status: TaskStatus): string => {
		if (typeof task.label === "string") return task.label;

		const labelObj = task.label as TaskLabel;
		const fallback = labelObj.idle || "Task";

		return (
			{
				running: labelObj.running || fallback || "Running...",
				success: labelObj.success || fallback || "Success",
				error: labelObj.error || fallback || "Error",
				warning:
					labelObj.success || fallback || "Success (with warnings)",
				idle: fallback,
			}[status] || fallback
		);
	};

	const getSymbol = (status: TaskStatus): string => {
		return (
			{
				idle: "□",
				running: spinnerFrames[spinnerFrame],
				success: "■",
				warning: "▲",
				error: "✗",
			}[status] || "□"
		);
	};

	const getColor = (status: TaskStatus): string => {
		return (
			{
				idle: "gray",
				running: "blue",
				success: "green",
				warning: "yellow",
				error: "red",
			}[status] || "gray"
		);
	};

	const updateTaskState = (taskId: string, newState: Partial<TaskState>) => {
		taskStore.update((store) => {
			// Update in allTaskStates
			const listStates = store.allTaskStates.get(taskListId) || new Map();
			const currentState = listStates.get(taskId) || { status: "idle" };
			const updatedStates = new Map(listStates);
			updatedStates.set(taskId, { ...currentState, ...newState });
			store.allTaskStates.set(taskListId, updatedStates);

			// Also update in taskListStates if it's a dynamic task
			if (taskId.includes("_dynamic_")) {
				const dynamicStates =
					store.taskListStates.get(taskListId) || new Map();
				dynamicStates.set(taskId, { ...currentState, ...newState });
				store.taskListStates.set(taskListId, dynamicStates);
			}

			store.revision += 1;
		});
	};

	const executeTask = async (task: Task, taskId: string): Promise<void> => {
		updateTaskState(taskId, { status: "running" });

		try {
			const completeOn = task.completeOn || "children"; // Default to 'children'
			let actionCompleted = false;
			let childrenCompleted = false;

			// Execute action if present
			const actionPromise = task.action
				? task.action().then(() => {
						actionCompleted = true;
				  })
				: Promise.resolve().then(() => {
						actionCompleted = true;
				  });

			// Handle different completion modes
			if (completeOn === "self") {
				// Complete after action, let children run in background
				await actionPromise;
				updateTaskState(taskId, { status: "success" });

				// Start children in background (don't await)
				if (task.tasks && task.tasks.length > 0) {
					const tasks = task.tasks; // Store reference to avoid undefined issues
					if (task.concurrent) {
						// Execute subtasks concurrently in background
						const promises = tasks.map((subtask, index) => {
							const subtaskId = getTaskId(
								subtask,
								index,
								`${taskId}.`
							);
							return executeTask(subtask, subtaskId);
						});
						Promise.allSettled(promises); // Don't await
					} else {
						// Execute subtasks sequentially in background
						(async () => {
							for (let i = 0; i < tasks.length; i++) {
								const subtask = tasks[i];
								const subtaskId = getTaskId(
									subtask,
									i,
									`${taskId}.`
								);
								await executeTask(subtask, subtaskId);
							}
						})(); // Don't await
					}
				}
			} else if (completeOn === "either") {
				// Complete when either action or all children finish first
				const childrenPromise =
					task.tasks && task.tasks.length > 0
						? (async () => {
								const tasks = task.tasks!; // Store reference to avoid undefined issues
								if (task.concurrent) {
									// Execute subtasks concurrently
									const promises = tasks.map(
										(subtask, index) => {
											const subtaskId = getTaskId(
												subtask,
												index,
												`${taskId}.`
											);
											return executeTask(
												subtask,
												subtaskId
											);
										}
									);
									await Promise.all(promises);
								} else {
									// Execute subtasks sequentially
									for (let i = 0; i < tasks.length; i++) {
										const subtask = tasks[i];
										const subtaskId = getTaskId(
											subtask,
											i,
											`${taskId}.`
										);
										await executeTask(subtask, subtaskId);
									}
								}
								childrenCompleted = true;
						  })()
						: Promise.resolve().then(() => {
								childrenCompleted = true;
						  });

				// Wait for whichever completes first
				await Promise.race([actionPromise, childrenPromise]);
				updateTaskState(taskId, { status: "success" });

				// Continue other tasks in background if needed
				if (!actionCompleted || !childrenCompleted) {
					Promise.allSettled([actionPromise, childrenPromise]); // Don't await
				}
			} else {
				// Default 'children' mode: complete after action + all children
				await actionPromise;

				if (task.tasks && task.tasks.length > 0) {
					if (task.concurrent) {
						// Execute subtasks concurrently
						const promises = task.tasks.map((subtask, index) => {
							const subtaskId = getTaskId(
								subtask,
								index,
								`${taskId}.`
							);
							return executeTask(subtask, subtaskId);
						});
						await Promise.all(promises);
					} else {
						// Execute subtasks sequentially
						for (let i = 0; i < task.tasks.length; i++) {
							const subtask = task.tasks[i];
							const subtaskId = getTaskId(
								subtask,
								i,
								`${taskId}.`
							);
							await executeTask(subtask, subtaskId);
						}
					}
				}

				updateTaskState(taskId, { status: "success" });
			}
		} catch (error) {
			if (error instanceof TaskWarning) {
				updateTaskState(taskId, {
					status: "warning",
					warning: error.message,
				});
			} else {
				updateTaskState(taskId, {
					status: "error",
					error:
						error instanceof Error ? error.message : String(error),
				});

				if (!task.continueOnError) {
					throw error;
				}
			}
		}
	};

	const executeAllTasks = async () => {
		setIsExecuting(true);

		try {
			// Execute tasks based on concurrent setting (default: parallel)
			if (options.concurrent === false) {
				// Sequential execution
				for (let i = 0; i < options.tasks.length; i++) {
					const task = options.tasks[i];
					await executeTask(task, getTaskId(task, i));
				}
			} else {
				// Parallel execution (default behavior)
				await Promise.allSettled(
					options.tasks.map((task: Task, i: number) =>
						executeTask(task, getTaskId(task, i))
					)
				);
			}
		} finally {
			setIsExecuting(false);
			// Don't auto-submit here - let dynamic tasks be added
			// Submission will happen when component detects all tasks complete
		}
	};

	const renderTask = (
		task: Task,
		index: number,
		parentId = "",
		level = 0
	): React.ReactNode => {
		const taskId = getTaskId(task, index, parentId);
		const state = taskStates.get(taskId) || { status: "idle" };
		const label = getLabel(task, state.status);
		const symbol = getSymbol(state.status);
		const indent = "  ".repeat(level);

		return (
			<Box key={taskId} flexDirection="column">
				<Box>
					<Text color={getColor(state.status)}>
						{indent}
						{symbol} {label}
					</Text>
				</Box>
				{state.warning && (
					<Box marginLeft={indent.length + 2}>
						<Text color="yellow">{state.warning}</Text>
					</Box>
				)}
				{state.error && (
					<Box marginLeft={indent.length + 2}>
						<Text color="red">{state.error}</Text>
					</Box>
				)}
				{task.tasks?.map((subtask, subIndex) =>
					renderTask(subtask, subIndex, `${taskId}.`, level + 1)
				)}
			</Box>
		);
	};

	const initializeTasksAsIdle = (tasks: Task[], parentId = "") => {
		tasks.forEach((task, index) => {
			const taskId = getTaskId(task, index, parentId);
			updateTaskState(taskId, { status: "idle" });

			// Recursively initialize subtasks
			if (task.tasks) {
				initializeTasksAsIdle(task.tasks, `${taskId}.`);
			}
		});
	};

	// Initialize all tasks as idle, then start execution after a brief delay
	useEffect(() => {
		if (node.state === "active" && !isExecuting) {
			// Initialize all tasks as idle for this task list
			initializeTasksAsIdle(options.tasks);

			// Start execution after a brief delay to show idle state
			setTimeout(() => {
				executeAllTasks();
			}, 400);
		}
	}, [node.state]);

	// Watch task states and auto-submit when all tasks complete
	useEffect(() => {
		if (node.state !== "active" || isExecuting) return;

		// Get all task states for this task list
		const allStates = Array.from(taskStates.values());

		// Need at least one task to check completion
		if (allStates.length === 0) return;

		// Check if all tasks are in a terminal state
		const allComplete = allStates.every(
			(state) =>
				state.status === "success" ||
				state.status === "error" ||
				state.status === "warning"
		);

		// Auto-submit when all tasks complete
		// Store reactivity ensures we'll see new tasks immediately via subscription
		if (allComplete && events.onSubmit) {
			events.onSubmit({ type: "auto" });
		}
	}, [taskStates, node.state, isExecuting, events.onSubmit]);

	const renderDynamicTasks = (): React.ReactNode[] => {
		// Get dynamic tasks and their states for this task list
		const dynamicTaskStates =
			store.taskListStates.get(taskListId) || new Map();
		const taskIds = [...dynamicTaskStates.keys()];

		return dynamicTasks
			.map((task, index) => {
				const taskId = taskIds[index];
				const state = taskId ? dynamicTaskStates.get(taskId) : null;

				if (!state || !task) return null;

				const label = getLabel(task, state.status);
				const symbol = getSymbol(state.status);

				return (
					<Box key={taskId} flexDirection="column">
						<Box>
							<Text color={getColor(state.status)}>
								{symbol} {label}
							</Text>
						</Box>
						{state.warning && (
							<Box marginLeft={2}>
								<Text color="yellow">⚠ {state.warning}</Text>
							</Box>
						)}
						{state.error && (
							<Box marginLeft={2}>
								<Text color="red">✗ {state.error}</Text>
							</Box>
						)}
					</Box>
				);
			})
			.filter(Boolean);
	};

	return (
		<Box flexDirection="column">
			{options.tasks.map((task: Task, index: number) =>
				renderTask(task, index)
			)}
			{renderDynamicTasks()}
		</Box>
	);
};
