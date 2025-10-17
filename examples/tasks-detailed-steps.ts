import { ask, tasks } from "../src/index.js";
import type { Task } from "../src/index.js";

/**
 * RECOMMENDED PATTERN for detailed task progress
 *
 * Instead of using streams inside tasks, use nested tasks to show detailed steps.
 * This works perfectly with the current architecture and provides clear visual hierarchy.
 */

const flow = async () => {
	const deploymentTasks: Task[] = [
		{
			label: "Pre-deployment checks",
			tasks: [
				{
					label: "Check git status",
					action: async () => {
						await new Promise((r) => setTimeout(r, 500));
					},
				},
				{
					label: "Verify dependencies",
					action: async () => {
						await new Promise((r) => setTimeout(r, 500));
					},
				},
			],
		},
		{
			label: "Build",
			tasks: [
				{
					label: "Clean dist directory",
					action: async () => {
						await new Promise((r) => setTimeout(r, 300));
					},
				},
				{
					label: "Compile TypeScript",
					action: async () => {
						await new Promise((r) => setTimeout(r, 800));
					},
				},
				{
					label: "Bundle with webpack",
					action: async () => {
						await new Promise((r) => setTimeout(r, 600));
					},
				},
				{
					label: "Optimize assets",
					action: async () => {
						await new Promise((r) => setTimeout(r, 400));
					},
				},
			],
		},
		{
			label: "Test",
			tasks: [
				{
					label: "Unit tests",
					action: async () => {
						await new Promise((r) => setTimeout(r, 600));
					},
				},
				{
					label: "Integration tests",
					action: async () => {
						await new Promise((r) => setTimeout(r, 800));
					},
				},
			],
		},
		{
			label: "Deploy",
			tasks: [
				{
					label: "Connect to server",
					action: async () => {
						await new Promise((r) => setTimeout(r, 500));
					},
				},
				{
					label: "Upload files",
					action: async () => {
						await new Promise((r) => setTimeout(r, 1000));
					},
				},
				{
					label: "Create backup",
					action: async () => {
						await new Promise((r) => setTimeout(r, 600));
					},
				},
				{
					label: "Restart services",
					action: async () => {
						await new Promise((r) => setTimeout(r, 700));
					},
				},
				{
					label: "Verify deployment",
					action: async () => {
						await new Promise((r) => setTimeout(r, 500));
					},
				},
			],
		},
	];

	await tasks(deploymentTasks);

	return "Deployment pipeline complete!";
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
