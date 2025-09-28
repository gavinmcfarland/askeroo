import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TaskWarning } from "./index.js";

export interface TaskLabel {
	idle?: string;
	running?: string;
	done?: string;
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

export interface TasksOptions {
	tasks: Task[];
	concurrent?: boolean; // Controls root-level task execution: true = parallel (default), false = sequential
	// Plugin component props
	onSubmit?: (value: void) => void;
	onBack?: () => void;
	completed?: boolean;
	disabled?: boolean;
}

type TaskStatus = "idle" | "running" | "done" | "error" | "warning";

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
	hasAnyTaskLists
} from "../task-store/TaskStore.js";

// Track active task lists for tasks.add() functionality
let activeTaskLists: Set<string> = new Set();
let mostRecentTaskListId: string | null = null;



// Function to end a task list
function endTaskList(taskListId: string) {
	activeTaskLists.delete(taskListId);
	if (mostRecentTaskListId === taskListId) {
		// Find the most recent active task list, or set to null if none
		const activeLists = Array.from(activeTaskLists);
		mostRecentTaskListId = activeLists.length > 0 ? activeLists[activeLists.length - 1] : null;
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
		// Execute the task after a short delay to show in UI
		setTimeout(async () => {
			try {
				updateTaskStateInStore(taskListId, taskId, { status: "running" });

				if (task.action) {
					await task.action();
				}

				updateTaskStateInStore(taskListId, taskId, { status: "done" });
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
		}, 100);
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
export function TasksDisplay(props: TasksOptions) {
	const [isExecuting, setIsExecuting] = useState(false);
	const [spinnerFrame, setSpinnerFrame] = useState(0);
	// Use a stable taskListId based on task content to enable state persistence
	const [taskListId] = useState(() => {
		// Create a deterministic ID based on task structure
		const taskHash = JSON.stringify(props.tasks.map(t => ({ label: t.label, concurrent: t.concurrent })));
		const hash = taskHash.split('').reduce((a, b) => {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a;
		}, 0);
		return `tasklist_${Math.abs(hash)}`;
	});

	// Use the existing local task state system for regular tasks
	const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(new Map());

	// Get dynamic tasks for this specific task list only
	const [dynamicTasks, setDynamicTasks] = useState<Array<any>>([]);

	// Load existing states from centralized store and keep dynamic tasks updated
	useEffect(() => {
		// Register this task list as active
		activeTaskLists.add(taskListId);
		mostRecentTaskListId = taskListId;

		// Load existing task states from centralized store
		const existingStates = getAllTaskStatesForList(taskListId);
		if (existingStates.size > 0) {
			setTaskStates(new Map(existingStates));
		}

		// Update dynamic tasks from centralized store
		const updateDynamicTasks = () => {
			setDynamicTasks(getDynamicTasksForList(taskListId));
		};

		// Initial load of dynamic tasks
		updateDynamicTasks();

		// Set up polling for dynamic tasks and state updates
		const interval = setInterval(() => {
			updateDynamicTasks();
			// Also refresh states from centralized store
			const latestStates = getAllTaskStatesForList(taskListId);
			setTaskStates(new Map(latestStates));
		}, 100);

		return () => clearInterval(interval);
	}, [taskListId]);

	// Animated spinner frames
	// const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
	// const spinnerFrames = ["⢄", "⢂", "⢁", "⡁", "⡈", "⡐", "⡠"];
	// const spinnerFrames = ["-", "\\", "|", "/"];
	const spinnerFrames = ["⠂", "-", "–", "—", "–", "-"];

	// Block all input during task execution to prevent escape sequences from showing
	useInput((_input, _key) => {
		// Consume and discard all input during execution to prevent it from appearing on screen
		if (isExecuting) {
			return; // Silently consume all input
		}
	});

	// Animate spinner for running tasks
	useEffect(() => {
		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 100); // Update every 100ms

		return () => clearInterval(interval);
	}, []);

	// Cleanup task list when component unmounts
	useEffect(() => {
		return () => {
			// Don't remove the task list from active tracking, but don't clean up data
			// This ensures task states persist even after component unmounts
			endTaskList(taskListId);
		};
	}, [taskListId]);

	const getTaskId = (_task: Task, index: number, parentId = ""): string => {
		return `${taskListId}_${parentId}${index}`;
	};

	const getLabel = (task: Task, status: TaskStatus): string => {
		if (typeof task.label === "string") {
			return task.label;
		}

		const labelObj = task.label as TaskLabel;
		switch (status) {
			case "running":
				return labelObj.running || labelObj.idle || "Running...";
			case "done":
				return labelObj.done || labelObj.idle || "Done";
			case "error":
				return labelObj.error || labelObj.idle || "Error";
			case "warning":
				return labelObj.done || labelObj.idle || "Done (with warnings)";
			default:
				return labelObj.idle || "Task";
		}
	};

	const getSymbol = (status: TaskStatus): string => {
		switch (status) {
			case "idle":
				return "□";
			case "running":
				return spinnerFrames[spinnerFrame];
			case "done":
				return "■";
			case "warning":
				return "▲";
			case "error":
				return "✗";
			default:
				return "□";
		}
	};

	const updateTaskState = (taskId: string, state: Partial<TaskState>) => {
		// Update both local state (for immediate UI updates) and centralized store (for persistence)
		setTaskStates(prev => {
			const newMap = new Map(prev);
			const currentState = newMap.get(taskId) || { status: "idle" };
			newMap.set(taskId, { ...currentState, ...state });
			return newMap;
		});

		// Also update centralized store for persistence
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
				updateTaskState(taskId, { status: "done" });

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
				updateTaskState(taskId, { status: "done" });

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

				updateTaskState(taskId, { status: "done" });
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
			if (props.concurrent === false) {
				// Sequential execution
				for (let i = 0; i < props.tasks.length; i++) {
					const task = props.tasks[i];
					await executeTask(task, getTaskId(task, i));
				}
			} else {
				// Parallel execution (default behavior)
				await Promise.allSettled(
					props.tasks.map((task, i) =>
						executeTask(task, getTaskId(task, i))
					)
				);
			}
		} finally {
			setIsExecuting(false);

			// Only submit after we know everything is done
			if (props.onSubmit && !props.completed && !props.disabled) {
				props.onSubmit!(undefined as any);
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
					<Text
						color={
							state.status === "error"
								? "red"
								: state.status === "warning"
								? "yellow"
								: state.status === "done"
								? "green"
								: state.status === "running"
								? "blue"
								: "gray"
						}
					>
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
				{task.tasks &&
					task.tasks.map((subtask, subIndex) =>
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
		if (
			!props.completed &&
			!props.disabled &&
			!isExecuting
		) {
			// Initialize all tasks as idle for this task list
			initializeTasksAsIdle(props.tasks);

			// Start execution after a brief delay to show idle state
			setTimeout(() => {
				executeAllTasks();
			}, 400);
		}
	}, [props.completed, props.disabled]);

	const renderDynamicTasks = (): React.ReactNode[] => {
		const dynamicTaskNodes: React.ReactNode[] = [];

		// Show only THIS task list's dynamic tasks
		const currentListStates = getTaskStatesForList(taskListId);
		dynamicTasks.forEach((task, index) => {
			// Find the corresponding task state
			const taskIds = Array.from(currentListStates.keys());
			const taskId = taskIds[index];
			const state = taskId ? currentListStates.get(taskId) : null;

			if (state && task) {
				const label = getLabel(task, state.status);
				const symbol = getSymbol(state.status);

				dynamicTaskNodes.push(
					<Box key={`current-${taskId}`} flexDirection="column">
						<Box>
							<Text
								color={
									state.status === "error"
										? "red"
										: state.status === "warning"
										? "yellow"
										: state.status === "done"
										? "green"
										: state.status === "running"
										? "blue"
										: "gray"
								}
							>
								{symbol} {label}
							</Text>
						</Box>
						{state.warning && (
							<Box marginLeft={2}>
								<Text color="yellow">
									⚠ {state.warning}
								</Text>
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
			{props.tasks.map((task, index) => renderTask(task, index))}
			{renderDynamicTasks()}
		</Box>
	);
}
