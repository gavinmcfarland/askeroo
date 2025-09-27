#!/usr/bin/env node
import { ask, tasks, TaskWarning, text } from "../src/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	const result = await tasks([
		{
			label: "Create component",
			action: async () => {
				await sleep(2000); // 2 second delay

				// Add a dynamic task during execution
				tasks.add({
					label: "Dynamic task added during execution",
					action: async () => {
						await sleep(1000);
					},
				});
			},
		},
		{
			label: "Setup",
			concurrent: false,
			tasks: [
				{
					label: "Generate files",
					action: async () => {
						await sleep(1500); // 1.5 second delay
					},
				},
				{
					label: "Install dependencies",
					action: async () => {
						await sleep(2000); // 2 second delay

						// Add another dynamic task
						tasks.add({
							label: "Additional cleanup task",
							action: async () => {
								await sleep(500);
							},
						});
					},
				},
			],
		},
		{
			label: "Parallel housekeeping",
			concurrent: true,
			tasks: [
				{
					label: {
						idle: "Initializing git",
						running: "Setting up git repository",
						done: "Git initialized",
						error: "Failed to initialize git",
					},
					action: async () => {
						await sleep(1000); // 1 second delay
					},
				},
				{
					label: {
						idle: "Checking environment",
						running: "Validating environment",
						done: "Environment checked",
						error: "Environment validation failed",
					},
					action: async () => {
						await sleep(1500); // 1.5 second delay
						// Demonstrate a warning that doesn't fail the run
						throw new TaskWarning(
							"Node v18 detected; v20 recommended"
						);
					},
				},
			],
		},
		{
			label: "Finalize",
			action: async () => {
				await sleep(3000); // 3 second delay
				// Uncomment to see error handling
				// throw new Error('Network went brr');
			},
			continueOnError: false,
		},
	]);

	if (result.totalTasks > 1) {
		await text({ label: "Name" });
	}

	tasks.add({
		label: "Additional cleanup task",
		action: async () => {
			await sleep(500);
		},
	});

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
