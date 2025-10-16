#!/usr/bin/env node
import { ask, tasks } from "../src/index.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	const answers = await tasks([
		{
			label: "Visible task 1",
			action: async () => {
				await sleep(1000);
				console.log("Task 1 completed (visible)");
			},
		},
		{
			label: "Hidden task",
			visible: false,
			action: async () => {
				await sleep(1500);
				console.log(
					"Hidden task completed - still runs but not shown!"
				);
			},
		},
		{
			label: "Visible task 2",
			action: async () => {
				await sleep(800);
				console.log("Task 2 completed (visible)");
			},
		},
		{
			label: "Parent task with hidden and visible children",
			action: async () => {
				await sleep(500);
			},
			tasks: [
				{
					label: "Visible child  sss",
					action: async () => {
						await sleep(600);
						console.log("Visible child completed");
					},
				},
				{
					label: "Hidden child",
					visible: false,
					action: async () => {
						await sleep(10000);
						console.log("Hidden child completed - still runs!");
					},
				},
			],
		},
	]);

	console.log("\nAll tasks completed (including hidden ones)!");
	console.log("Answers:", answers);
};

(async () => {
	try {
		await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
