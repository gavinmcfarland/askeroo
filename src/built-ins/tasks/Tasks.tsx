import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { TaskWarning } from "./index.js";
import { PluginComponentProps } from "../../types/index.js";
import { taskStore, hasAnyTaskLists } from "./task-store.js";
import type {
	Task,
	TaskLabel,
	TasksOptions,
	TaskStatus,
	TaskState,
	CompleteOn,
} from "./types.js";

export type {
	Task,
	TaskLabel,
	CompleteOn,
	TasksOptions,
	TaskStatus,
	TaskState,
};

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

// Helper to update task state in the store
function setTaskState(taskListId: string, taskId: string, state: TaskState) {
	taskStore.update((store) => {
		const allStates = new Map(
			store.allTaskStates.get(taskListId) || new Map()
		);
		allStates.set(taskId, state);
		store.allTaskStates.set(taskListId, allStates);

		if (taskId.includes("_dynamic_")) {
			const dynamicStates =
				store.taskListStates.get(taskListId) || new Map();
			dynamicStates.set(taskId, state);
		}
		store.revision++;
	});
}

// Function to add a task dynamically
export function addDynamicTask(task: Task): Promise<void> {
	if (!mostRecentTaskListId) return Promise.resolve();

	const taskListId = mostRecentTaskListId;
	const taskId = `${taskListId}_dynamic_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 11)}`;

	return new Promise<void>((resolve, reject) => {
		const executor = async () => {
			try {
				setTaskState(taskListId, taskId, { status: "running" });
				await task.action?.();
				setTaskState(taskListId, taskId, { status: "success" });
				resolve();
			} catch (error) {
				const isWarning = error instanceof TaskWarning;
				setTaskState(taskListId, taskId, {
					status: isWarning ? "warning" : "error",
					[isWarning ? "warning" : "error"]:
						error instanceof Error ? error.message : String(error),
				});
				isWarning ? resolve() : reject(error);
			}
		};

		taskStore.update((store) => {
			store.taskListDynamicTasks.set(taskListId, [
				...(store.taskListDynamicTasks.get(taskListId) || []),
				task,
			]);
			store.pendingTaskExecutors.set(taskId, executor);
			store.revision++;
		});

		setTaskState(taskListId, taskId, { status: "idle" });

		setTimeout(() => {
			if (taskStore.get().pendingTaskExecutors.has(taskId)) {
				taskStore.update((store) => {
					store.pendingTaskExecutors.delete(taskId);
					store.revision++;
				});
				executor();
			}
		}, 500);
	});
}

// Function to wait for all pending tasks to complete
export async function waitForPendingTasks(): Promise<void> {
	return new Promise((resolve) => {
		let timeout: NodeJS.Timeout | null = null;

		const isComplete = () => {
			const store = taskStore.get();
			for (const states of store.allTaskStates.values()) {
				for (const state of states.values()) {
					if (state.status === "idle" || state.status === "running")
						return false;
				}
			}
			return true;
		};

		const unsubscribe = taskStore.subscribe(() => {
			if (timeout) clearTimeout(timeout);

			if (isComplete()) {
				timeout = setTimeout(() => {
					if (isComplete()) {
						// Re-check after grace period
						unsubscribe();
						resolve();
					}
				}, 100);
			}
		});

		// Initial check
		if (isComplete()) {
			timeout = setTimeout(() => {
				if (isComplete()) {
					unsubscribe();
					resolve();
				}
			}, 100);
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

	// Start pending tasks after showing idle state
	useEffect(() => {
		const pendingTaskIds = [...pendingExecutors.keys()].filter((id) =>
			id.startsWith(taskListId)
		);

		if (pendingTaskIds.length > 0) {
			const timeoutId = setTimeout(() => {
				pendingTaskIds.forEach((taskId) => {
					const executor = taskStore
						.get()
						.pendingTaskExecutors.get(taskId);
					if (executor) {
						taskStore.update((store) => {
							store.pendingTaskExecutors.delete(taskId);
							store.revision++;
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
				running: labelObj.running,
				success: labelObj.success,
				error: labelObj.error,
				warning: labelObj.success,
				idle: fallback,
			}[status] || fallback
		);
	};

	const getSymbol = (status: TaskStatus) =>
		({
			idle: "□",
			running: spinnerFrames[spinnerFrame],
			success: "■",
			warning: "▲",
			error: "✗",
		}[status] || "□");

	const getColor = (status: TaskStatus) =>
		({
			idle: "gray",
			running: "blue",
			success: "green",
			warning: "yellow",
			error: "red",
		}[status] || "gray");

	const updateTaskState = (taskId: string, newState: Partial<TaskState>) => {
		taskStore.update((store) => {
			const allStates = new Map(
				store.allTaskStates.get(taskListId) || new Map()
			);
			allStates.set(taskId, {
				...(allStates.get(taskId) || { status: "idle" }),
				...newState,
			});
			store.allTaskStates.set(taskListId, allStates);

			if (taskId.includes("_dynamic_")) {
				const dynamicStates =
					store.taskListStates.get(taskListId) || new Map();
				dynamicStates.set(taskId, {
					...(dynamicStates.get(taskId) || { status: "idle" }),
					...newState,
				});
			}
			store.revision++;
		});
	};

	const executeTask = async (task: Task, taskId: string): Promise<void> => {
		updateTaskState(taskId, { status: "running" });

		const executeChildren = async () => {
			if (!task.tasks) return;
			const promises = task.tasks.map((subtask, subIndex) =>
				executeTask(subtask, getTaskId(subtask, subIndex, `${taskId}.`))
			);
			return task.concurrent
				? Promise.all(promises)
				: promises.reduce(
						(prev, current) => prev.then(() => current),
						Promise.resolve()
				  );
		};

		try {
			const action = task.action?.() || Promise.resolve();
			const completeOn = task.completeOn || "children";

			if (completeOn === "self") {
				await action;
				updateTaskState(taskId, { status: "success" });
				executeChildren(); // Background
			} else if (completeOn === "either") {
				await Promise.race([action, executeChildren()]);
				updateTaskState(taskId, { status: "success" });
				Promise.allSettled([action, executeChildren()]); // Continue others
			} else {
				await action;
				await executeChildren();
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
				if (!task.continueOnError) throw error;
			}
		}
	};

	const executeAllTasks = async () => {
		setIsExecuting(true);
		try {
			if (options.concurrent === false) {
				for (let index = 0; index < options.tasks.length; index++) {
					await executeTask(
						options.tasks[index],
						getTaskId(options.tasks[index], index)
					);
				}
			} else {
				await Promise.allSettled(
					options.tasks.map((task, index) =>
						executeTask(task, getTaskId(task, index))
					)
				);
			}
		} finally {
			setIsExecuting(false);
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
		const indent = "  ".repeat(level);

		return (
			<Box key={taskId} flexDirection="column">
				<Text color={getColor(state.status)}>
					{indent}
					{getSymbol(state.status)} {getLabel(task, state.status)}
				</Text>
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
			if (task.tasks) initializeTasksAsIdle(task.tasks, `${taskId}.`);
		});
	};

	// Initialize and execute tasks
	useEffect(() => {
		if (node.state === "active" && !isExecuting) {
			initializeTasksAsIdle(options.tasks);
			setTimeout(executeAllTasks, 400);
		}
	}, [node.state]);

	// Auto-submit when all tasks complete
	useEffect(() => {
		if (node.state !== "active" || isExecuting) return;
		const states = Array.from(taskStates.values());
		if (
			states.length > 0 &&
			states.every((state) =>
				["success", "error", "warning"].includes(state.status)
			)
		) {
			events.onSubmit?.({ type: "auto" });
		}
	}, [taskStates, node.state, isExecuting, events.onSubmit]);

	const renderDynamicTasks = () => {
		const dynamicStates = store.taskListStates.get(taskListId) || new Map();
		const taskIds = [...dynamicStates.keys()];

		return dynamicTasks
			.map((task, index) => {
				const state = dynamicStates.get(taskIds[index]);
				if (!state) return null;
				return (
					<Box key={taskIds[index]} flexDirection="column">
						<Text color={getColor(state.status)}>
							{getSymbol(state.status)}{" "}
							{getLabel(task, state.status)}
						</Text>
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
			{options.tasks.map((task, index) => renderTask(task, index))}
			{renderDynamicTasks()}
		</Box>
	);
};
