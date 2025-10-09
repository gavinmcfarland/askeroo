import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TaskWarning } from "./index.js";
import { PluginComponentProps } from "../../types/index.js";
import { usePromptData } from "../../core/plugin-state-context.js";

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

import {
	addDynamicTaskToList,
	updateTaskState as updateTaskStateInStore,
	getDynamicTasksForList,
	getTaskStatesForList,
	getAllTaskStatesForList,
	hasAnyTaskLists,
	registerTaskExecutor,
	getPendingTaskIds,
	startPendingTask,
} from "./task-store.js";

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

	// Add task to the centralized store and get the generated task ID
	const taskId = addDynamicTaskToList(taskListId, task);

	// Create a promise that will resolve when this task completes
	const taskPromise = new Promise<void>((resolve, reject) => {
		// Create the executor function that will run the task
		const executor = async () => {
			try {
				updateTaskStateInStore(taskListId, taskId, {
					status: "running",
				});

				if (task.action) {
					await task.action();
				}

				updateTaskStateInStore(taskListId, taskId, {
					status: "success",
				});
				resolve();
			} catch (error) {
				if (error instanceof TaskWarning) {
					updateTaskStateInStore(taskListId, taskId, {
						status: "warning",
						warning: error.message,
					});
					resolve(); // Warnings don't reject
				} else {
					updateTaskStateInStore(taskListId, taskId, {
						status: "error",
						error:
							error instanceof Error
								? error.message
								: String(error),
					});
					reject(error);
				}
			}
		};

		// Register the executor to be started by the polling mechanism
		// This ensures the idle state is rendered before execution begins
		registerTaskExecutor(taskId, executor);
	});

	return taskPromise;
}

// Function to wait for all pending tasks to complete
export async function waitForPendingTasks(): Promise<void> {
	// With the new centralized approach, this function is simplified
	// Dynamic tasks are now managed at the PromptApp level
	return Promise.resolve();
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

	// Subscribe to prompt state and read data in one line!
	// Note: Don't wrap with new Map() - the cached instance is already a Map
	const taskStates = usePromptData(() => getAllTaskStatesForList(taskListId));
	const dynamicTasks = usePromptData(() =>
		getDynamicTasksForList(taskListId)
	);

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
		const pendingTaskIds = getPendingTaskIds(taskListId);
		if (pendingTaskIds.length > 0) {
			// Use setTimeout to ensure the current render completes first
			setTimeout(() => {
				pendingTaskIds.forEach((taskId) => {
					startPendingTask(taskId);
				});
			}, 400); // 400ms to show idle state, consistent with initial task delay
		}
	}, [dynamicTasks, taskListId]);

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
		const hasRunningTasks =
			[...taskStates.values()].some(
				(state) => state.status === "running"
			) ||
			getDynamicTasksForList(taskListId).some((_, index) => {
				const currentListStates = getTaskStatesForList(taskListId);
				const taskIds = [...currentListStates.keys()];
				const taskId = taskIds[index];
				const state = taskId ? currentListStates.get(taskId) : null;
				return state?.status === "running";
			});

		if (!hasRunningTasks) {
			return; // Don't start animation if no tasks are running
		}

		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 150); // Reduced frequency from 100ms to 150ms for better performance

		return () => clearInterval(interval);
	}, [taskStates, dynamicTasks, taskListId]);

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

	const updateTaskState = (taskId: string, state: Partial<TaskState>) => {
		// Update centralized store - component will auto-update via usePromptData
		updateTaskStateInStore(taskListId, taskId, state);
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

			// Only submit after we know everything is done
			if (events.onSubmit && node.state === "active") {
				events.onSubmit({ type: "auto" });
			}
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

	const renderDynamicTasks = (): React.ReactNode[] => {
		const dynamicTaskNodes: React.ReactNode[] = [];

		// Show only THIS task list's dynamic tasks
		const currentListStates = getTaskStatesForList(taskListId);
		dynamicTasks.forEach((task, index) => {
			// Find the corresponding task state
			const taskIds = [...currentListStates.keys()];
			const taskId = taskIds[index];
			const state = taskId ? currentListStates.get(taskId) : null;

			if (state && task) {
				const label = getLabel(task, state.status);
				const symbol = getSymbol(state.status);

				dynamicTaskNodes.push(
					<Box key={`current-${taskId}`} flexDirection="column">
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
			}
		});

		return dynamicTaskNodes;
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
