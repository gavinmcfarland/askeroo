#!/usr/bin/env node
import { ask, tasks, TaskWarning, text } from "../src/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	const name = await text({ label: "Name" });

	let result;

	if (name === "admin") {
		result = await tasks([
			{
				label: "Create component",
				action: async () => {
					await sleep(3000); // 3 second delay

					// Add a dynamic task from within a running task
					await tasks.add([
						{
							label: "Dynamic task from component creation",
							action: async () => {
								await sleep(2000); // 2 second delay
							},
						},
					]);
				},
			},
			{
				label: "Setup",
				concurrent: false,
				tasks: [
					{
						label: "Generate files",
						action: async () => {
							await sleep(6000); // 3 second delay
						},
					},
					{
						label: "Install dependencies",
						action: async () => {
							await sleep(6000);

							// Add another dynamic task during setup
							await tasks.add([
								{
									label: "Configure environment",
									action: async () => {
										await sleep(1500);
									},
								},
							]);
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
							success: "Git initialized",
							error: "Failed to initialize git",
						},
						action: async () => {
							await sleep(2000); // 2 second delay
						},
					},
					{
						label: {
							idle: "Checking environment",
							running: "Validating environment",
							success: "Environment checked",
							error: "Environment validation failed",
						},
						action: async () => {
							await sleep(2500); // 2.5 second delay
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
					await sleep(2000); // 2 second delay
					// Uncomment to see error handling
					// throw new Error('Network went brr');
				},
				continueOnError: false,
			},
		]);
	}

	await tasks.add([
		{
			label: "Clean up",
			action: async () => {
				await sleep(1500);
			},
		},
	]);

	await tasks([
		{
			label: "Second task list",
			action: async () => {
				await sleep(1500);
			},
		},
	]);

	await tasks.add([
		{
			label: "Clean up",
			action: async () => {
				await sleep(1500);
			},
		},
	]);

	if (result?.totalTasks && result.totalTasks > 1) {
		await text({ label: "Name" });

		await tasks.add([
			{
				label: "Post-completion cleanup task",
				action: async () => {
					await sleep(2000);
				},
			},
		]);
	}

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
