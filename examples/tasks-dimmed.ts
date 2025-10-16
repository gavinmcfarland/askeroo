#!/usr/bin/env node
import { ask, tasks } from "../src/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	await tasks([
		{
			label: "Regular Task",
			action: async () => {
				await sleep(500);
			},
		},
		{
			label: "Dimmed Task",
			dimmed: true,
			action: async () => {
				await sleep(500);
			},
		},
		{
			label: "Parent Task with Dimmed Subtasks",
			action: async () => {
				await sleep(300);
			},
			tasks: [
				{
					label: "Subtask 1 (normal)",
					action: async () => {
						await sleep(300);
					},
				},
				{
					label: "Subtask 2 (dimmed)",
					dimmed: true,
					action: async () => {
						await sleep(300);
					},
				},
			],
		},
		{
			label: "Dimmed Parent (all children dimmed)",
			dimmed: true,
			action: async () => {
				await sleep(300);
			},
			tasks: [
				{
					label: "Subtask A",
					action: async () => {
						await sleep(300);
					},
				},
				{
					label: "Subtask B",
					action: async () => {
						await sleep(300);
					},
					tasks: [
						{
							label: "Nested Subtask",
							action: async () => {
								await sleep(300);
							},
						},
					],
				},
			],
		},
	]);

	return "Tasks completed!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log(result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
