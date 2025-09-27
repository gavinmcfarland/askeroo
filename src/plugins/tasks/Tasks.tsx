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

// Main component for the plugin
export function TasksDisplay(props: TasksOptions) {
	const [taskStates, setTaskStates] = useState<Map<string, TaskState>>(
		new Map()
	);
	const [isExecuting, setIsExecuting] = useState(false);

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
		setTaskStates((prev) => {
			const newMap = new Map(prev);
			const currentState = newMap.get(taskId) || { status: "idle" };
			newMap.set(taskId, { ...currentState, ...state });
			return newMap;
		});
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
						<Text color="yellow">⚠ {state.warning}</Text>
					</Box>
				)}
				{state.error && (
					<Box marginLeft={indent.length + 2}>
						<Text color="red">✗ {state.error}</Text>
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
		if (!props.completed && !props.disabled && !isExecuting) {
			// Initialize all tasks (and nested subtasks) as idle first
			initializeTasksAsIdle(props.tasks);

			// Start execution after a brief delay to show idle state
			setTimeout(() => {
				executeAllTasks();
			}, 400);
		}
	}, [props.completed, props.disabled]);

	return (
		<Box flexDirection="column">
			{props.tasks.map((task, index) => renderTask(task, index))}
		</Box>
	);
}
