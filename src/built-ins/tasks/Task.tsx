import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { createPrompt } from "../../core/registry.js";
import { getCurrentRuntime, hasRuntime } from "../../core/runtime-context.js";
import { TaskWarning } from "./index.js";
import type { Task as TaskDef, TaskStatus, TaskLabel } from "./types.js";

export interface TaskPromptOptions extends TaskDef {
	taskId?: string; // For tracking in parent
	parentTaskListId?: string; // For dynamic task support
}

/**
 * Display component for a single task
 */
export const TaskDisplay = ({
	node,
	options,
	events,
}: {
	node: any;
	options: TaskPromptOptions;
	events: any;
}) => {
	const [status, setStatus] = useState<TaskStatus>("idle");
	const [error, setError] = useState<string | undefined>();
	const [warning, setWarning] = useState<string | undefined>();
	const [spinnerFrame, setSpinnerFrame] = useState(0);

	const spinnerFrames = ["⠂", "-", "–", "—", "–", "-"];

	// Block input during task execution
	useInput(() => {}, { isActive: status === "running" });

	// Animate spinner when running
	useEffect(() => {
		if (status !== "running") return;

		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 150);

		return () => clearInterval(interval);
	}, [status]);

	// Execute task action and subtasks when node becomes active
	useEffect(() => {
		if (node.state !== "active" || status !== "idle") return;

		const executeTask = async () => {
			setStatus("running");

			try {
				// Execute action if present
				if (options.action) {
					// Execute through runtime to enable prompt detection
					if (hasRuntime()) {
						const runtime = getCurrentRuntime();
						// Use the node ID as task context
						await runtime.executeTaskAction(
							node.id,
							options.action
						);
					} else {
						await options.action();
					}
				}

				// Execute subtasks if present
				if (options.tasks && options.tasks.length > 0) {
					// Import tasks function to execute subtasks
					const { tasks } = await import("./index.js");
					await tasks(options.tasks, {
						concurrent: options.concurrent,
					});
				}

				setStatus("success");

				// Auto-submit after completion
				setTimeout(() => {
					if (events.onSubmit) {
						events.onSubmit({ type: "auto" });
					}
				}, 100);
			} catch (err) {
				if (err instanceof TaskWarning) {
					setWarning(err.message);
					setStatus("warning");
					// Continue execution for warnings
					setTimeout(() => {
						if (events.onSubmit) {
							events.onSubmit({ type: "auto" });
						}
					}, 100);
				} else {
					setError(err instanceof Error ? err.message : String(err));
					setStatus("error");

					if (!options.continueOnError) {
						// Submit with error to propagate
						setTimeout(() => {
							if (events.onSubmit) {
								events.onSubmit({ type: "auto", error: err });
							}
						}, 100);
					} else {
						// Continue despite error
						setTimeout(() => {
							if (events.onSubmit) {
								events.onSubmit({ type: "auto" });
							}
						}, 100);
					}
				}
			}
		};

		// Start after showing idle state briefly
		const timer = setTimeout(executeTask, 200);
		return () => clearTimeout(timer);
	}, [node.state, status]);

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

	const getLabel = (status: TaskStatus): string => {
		if (typeof options.label === "string") return options.label;

		const labelObj = options.label as TaskLabel;
		const fallback = labelObj.idle || "Task";

		return (
			{
				idle: fallback,
				running: labelObj.running || fallback || "Running...",
				success: labelObj.success || fallback || "Success",
				error: labelObj.error || fallback || "Error",
				warning:
					labelObj.success || fallback || "Success (with warnings)",
			}[status] || fallback
		);
	};

	// Don't render if hidden and no error/warning
	if (
		options.visible === false &&
		status !== "error" &&
		status !== "warning"
	) {
		return null;
	}

	const isDimmed = options.dimmed || false;

	return (
		<Box flexDirection="column">
			<Text color={getColor(status)} dimColor={isDimmed}>
				{getSymbol(status)} {getLabel(status)}
			</Text>
			{warning && (
				<Box marginLeft={2}>
					<Text color="yellow" dimColor={isDimmed}>
						{warning}
					</Text>
				</Box>
			)}
			{error && (
				<Box marginLeft={2}>
					<Text color="red" dimColor={isDimmed}>
						{error}
					</Text>
				</Box>
			)}
			{/* Child prompts (streams, spinners, etc.) render here via node.children */}
			{node.children && node.children.length > 0 && (
				<Box flexDirection="column" marginLeft={2}>
					{node.children}
				</Box>
			)}
		</Box>
	);
};

/**
 * Internal task prompt - creates a single task node
 * Works as a container plugin similar to group
 */
export const taskInternal = createPrompt<TaskPromptOptions, void>({
	type: "task",
	component: TaskDisplay,
	autoSubmit: true, // Tasks auto-submit after execution
	isContainer: true, // Tasks can contain child prompts

	// Execute function handles the task execution logic
	execute: async (runtime, opts) => {
		await runtime.executeTaskBody(opts);
	},
});
