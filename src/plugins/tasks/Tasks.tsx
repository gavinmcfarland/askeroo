import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { TaskWarning } from "./index.js";

export interface TaskLabel {
	idle?: string;
	running?: string;
	done?: string;
	error?: string;
}

export interface Task {
	label: string | TaskLabel;
	action?: () => Promise<void>;
	tasks?: Task[];
	concurrent?: boolean;
	continueOnError?: boolean;
}

export interface TasksOptions {
	tasks: Task[];
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

// Global state for tracking task states across component remounts
let globalTaskStates: Map<string, TaskState> = new Map();
let globalUpdateListeners: Set<() => void> = new Set();

// Global pending tasks queue for dynamic task addition
let globalPendingTasks: Task[] = [];
let globalPendingTaskPromises: Promise<void>[] = [];
let globalTaskCounter = 0;

// Function to update global task state and notify listeners
function updateGlobalTaskState(taskId: string, state: Partial<TaskState>) {
	const currentState = globalTaskStates.get(taskId) || { status: "idle" };
	globalTaskStates.set(taskId, { ...currentState, ...state });
	globalUpdateListeners.forEach((listener) => listener());
}

// Function to clear global state (for new task runs)
function clearGlobalTaskState() {
	globalTaskStates.clear();
	globalPendingTasks = [];
	globalPendingTaskPromises = [];
	globalTaskCounter = 0;
	globalUpdateListeners.forEach((listener) => listener());
}

// Global task storage for result generation
let globalTasks: Task[] = [];

// Export functions for accessing global state
export function getGlobalTaskStates(): Map<string, TaskState> {
	return new Map(globalTaskStates);
}

export function getTaskLabel(taskId: string): string | undefined {
	// Handle dynamic tasks
	if (taskId.startsWith("dynamic.")) {
		const index = parseInt(taskId.split(".")[1]);
		const task = globalPendingTasks[index];
		if (task) {
			return typeof task.label === "string"
				? task.label
				: task.label.idle || "Dynamic Task";
		}
		return "Dynamic Task";
	}

	// Parse task ID to find the corresponding task
	const parts = taskId.split(".");
	let currentTasks = globalTasks;
	let task: Task | undefined;

	for (let i = 0; i < parts.length; i++) {
		const index = parseInt(parts[i]);
		if (currentTasks && currentTasks[index]) {
			task = currentTasks[index];
			currentTasks = task.tasks || [];
		} else {
			return undefined;
		}
	}

	if (task) {
		return typeof task.label === "string"
			? task.label
			: task.label.idle || "Task";
	}
	return undefined;
}

// Function to add a task dynamically
export function addDynamicTask(task: Task): Promise<void> {
	// Add task to pending tasks
	globalPendingTasks.push(task);

	// Create a promise that will resolve when this task completes
	const taskPromise = new Promise<void>((resolve, reject) => {
		const taskId = `dynamic.${globalTaskCounter++}`;

		// Initialize the task as idle
		updateGlobalTaskState(taskId, { status: "idle" });

		// Execute the task after a short delay to show in UI
		setTimeout(async () => {
			try {
				updateGlobalTaskState(taskId, { status: "running" });

				if (task.action) {
					await task.action();
				}

				updateGlobalTaskState(taskId, { status: "done" });
				resolve();
			} catch (error) {
				if (error instanceof TaskWarning) {
					updateGlobalTaskState(taskId, {
						status: "warning",
						warning: error.message,
					});
					resolve(); // Warnings don't reject
				} else {
					updateGlobalTaskState(taskId, {
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

	// Add to global promises to track
	globalPendingTaskPromises.push(taskPromise);

	return taskPromise;
}

// Function to wait for all pending tasks to complete
export async function waitForPendingTasks(): Promise<void> {
	while (globalPendingTaskPromises.length > 0) {
		const currentPromises = [...globalPendingTaskPromises];
		globalPendingTaskPromises = [];

		await Promise.allSettled(currentPromises);

		// Check if new tasks were added during execution
		if (globalPendingTaskPromises.length > 0) {
			continue;
		}
		break;
	}
}

// Main component for the plugin
export function TasksDisplay(props: TasksOptions) {
	const [taskStates, setTaskStates] =
		useState<Map<string, TaskState>>(globalTaskStates);
	const [isExecuting, setIsExecuting] = useState(false);

	// Subscribe to global state updates
	useEffect(() => {
		const updateListener = () => {
			setTaskStates(new Map(globalTaskStates));
		};

		globalUpdateListeners.add(updateListener);

		return () => {
			globalUpdateListeners.delete(updateListener);
		};
	}, []);

	const getTaskId = (_task: Task, index: number, parentId = ""): string => {
		return `${parentId}${index}`;
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
				return "⋯";
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
		updateGlobalTaskState(taskId, state);
	};

	const executeTask = async (task: Task, taskId: string): Promise<void> => {
		updateTaskState(taskId, { status: "running" });

		try {
			if (task.action) {
				await task.action();
			}

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
						const subtaskId = getTaskId(subtask, i, `${taskId}.`);
						await executeTask(subtask, subtaskId);
					}
				}
			}

			updateTaskState(taskId, { status: "done" });
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
			// Wait for all tasks to actually complete using Promise.allSettled
			await Promise.allSettled(
				props.tasks.map((task, i) =>
					executeTask(task, getTaskId(task, i))
				)
			);
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
			!isExecuting &&
			globalTaskStates.size === 0
		) {
			// Store tasks globally for result generation
			globalTasks = props.tasks;

			// Clear any previous state and initialize all tasks as idle
			clearGlobalTaskState();
			initializeTasksAsIdle(props.tasks);

			// Start execution after a brief delay to show idle state
			setTimeout(() => {
				executeAllTasks();
			}, 400);
		}
	}, [props.completed, props.disabled]);

	const renderDynamicTasks = (): React.ReactNode[] => {
		const dynamicTasks: React.ReactNode[] = [];

		// Render all dynamic tasks that have been added
		for (let i = 0; i < globalTaskCounter; i++) {
			const taskId = `dynamic.${i}`;
			const state = taskStates.get(taskId);

			if (state) {
				const taskIndex = i;
				const task = globalPendingTasks[taskIndex];

				if (task) {
					const label = getLabel(task, state.status);
					const symbol = getSymbol(state.status);

					dynamicTasks.push(
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
			}
		}

		return dynamicTasks;
	};

	return (
		<Box flexDirection="column">
			{props.tasks.map((task, index) => renderTask(task, index))}
			{renderDynamicTasks()}
		</Box>
	);
}
