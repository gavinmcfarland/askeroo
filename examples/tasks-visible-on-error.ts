#!/usr/bin/env node
import { ask, tasks, TaskWarning } from "../src/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	console.log("\nTesting invisible tasks that show on error/warning:\n");

	await tasks([
		{
			label: "Normal visible task (success)",
			action: async () => {
				await sleep(300);
			},
		},
		{
			label: "Invisible task (success) - should be hidden",
			visible: false,
			action: async () => {
				await sleep(300);
			},
		},
		{
			label: "Invisible task (warning) - should be visible!",
			visible: false,
			action: async () => {
				await sleep(10000);
				throw new TaskWarning("This task had a warning!");
			},
		},
		{
			label: "Invisible task (error) - should be visible!",
			visible: false,
			continueOnError: true,
			action: async () => {
				await sleep(20000);
				throw new Error("This task failed!");
			},
		},
		{
			label: "Another normal visible task",
			action: async () => {
				await sleep(300);
			},
		},
		{
			label: "Parent with invisible subtasks",
			action: async () => {
				await sleep(200);
			},
			tasks: [
				{
					label: "Invisible subtask (success) - hidden",
					visible: false,
					action: async () => {
						await sleep(200);
					},
				},
				{
					label: "Invisible subtask (warning) - visible!",
					visible: false,
					action: async () => {
						await sleep(3000);
						throw new TaskWarning("Subtask warning!");
					},
				},
				{
					label: "Visible subtask (success)",
					action: async () => {
						await sleep(200);
					},
				},
			],
		},
	]);

	return "Tasks completed!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
