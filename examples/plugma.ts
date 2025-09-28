#!/usr/bin/env node
import {
	ask,
	group,
	text,
	confirm,
	radio,
	multi,
	tasks,
} from "../src/index.js";
import { completedFields } from "../src/plugins/completed-fields/index.js";
import { note } from "../src/plugins/note/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	await note("[ Plugma ]{bgMagenta} [v2.1.0]{dim}");

	await completedFields();

	const answers = await group(
		async () => {
			return {
				path: await text({
					shortLabel: "Path",
					label: "Where should it be created?",
					initialValue: "./my-plugin",
					onValidate: async (value) => {
						if (!value.trim()) return "Path cannot be empty";
						if (value.includes(".."))
							return "Path cannot contain '..'";
						if (value === "." || value === "./" || value === "/")
							return "Please specify a folder name, not the root directory";
						if (value.includes("//"))
							return "Invalid path: double slashes not allowed";
						if (value.endsWith("/"))
							return "Path cannot end with a slash";

						// Check if the base directory exists (parent path for nested paths)
						try {
							const fs = await import("fs");
							const path = await import("path");
							const resolvedPath = path.resolve(value);
							const parentPath = path.dirname(resolvedPath);
							const stats = await fs.promises.stat(parentPath);
							if (!stats.isDirectory()) {
								return "Base directory does not exist";
							}
						} catch (error) {
							return "Base directory does not exist or is not accessible";
						}

						return null;
					},
				}),
				type: await radio({
					label: "Choose a type:",
					shortLabel: "Type",
					options: [
						{ value: "plugin", label: "Plugin" },
						{ value: "widget", label: "Widget" },
					],
				}),
				framework: await radio({
					label: "Select a framework:",
					shortLabel: "Framework",
					options: [
						{ value: "react", label: "React", color: "red" },
						{ value: "vue", label: "Vue", color: "green" },
						{ value: "svelte", label: "Svelte", color: "yellow" },
						{ value: "no-ui", label: "No UI" },
					],
				}),
				template: await radio({
					shortLabel: "Template",
					label: "Choose a template:",
					hintPosition: "inline-fixed",
					options: [
						{
							value: "default",
							label: "Default",
							hint: "A basic template to get you started",
						},
						{
							value: "minimal",
							label: "Rectangle creator",
							hint: "A minimal template to create rectangles",
						},
					],
				}),
				addons: await multi({
					shortLabel: "Addons",
					label: "Choose addons:",
					hintPosition: "inline-fixed",
					options: [
						{
							value: "tailwind",
							label: "Tailwind",
							hint: "A utility-first CSS framework",
						},
						{
							value: "shadcn",
							label: "Shadcn",
							hint: "A library of components for building websites",
						},
						{
							value: "eslint",
							label: "ESLint",
						},
						{
							value: "prettier",
							label: "Prettier",
							hint: "A formatter for JavaScript",
						},
						{
							value: "vitest",
							label: "Vitest",
							hint: "A testing framework for JavaScript",
						},
						{
							value: "playwright",
							label: "Playwright",
							hint: "A testing framework for JavaScript",
						},
					],
					noneOption: { label: "None" },
					searchable: true,
				}),
				typescript: await confirm({
					shortLabel: "TypeScript",
					label: "Use TypeScript?",
					initialValue: true,
				}),
			};
		},
		{ flow: "phased" }
	);

	// Example of sequential execution using the new API with completeOn setting
	const tasksResult = await tasks(
		[
			{
				label: `Creating ${answers.type} from template`,
				action: async () => {
					await sleep(1000);
				},
			},
			{
				label: `Integrating chosen add-ons`,
				action: async () => {
					await sleep(10000);
				},
				completeOn: "children", // Default: complete after action + all children
			},
		],
		{
			concurrent: false,
		}
	);

	// await group(
	// 	async () => {
	const pkgManager = await radio({
		label: "Install dependencies?",
		shortLabel: "Dependencies",
		initialValue: "npm",
		options: [
			{ value: "skip", label: "Skip" },
			{ value: "npm", label: "npm" },
			{ value: "pnpm", label: "pnpm" },
			{ value: "yarn", label: "yarn" },
			{ value: "bun", label: "bun" },
			{ value: "deno", label: "deno" },
		],
		excludeFromCompleted: true,
		hideAfterSubmit: true,
		allowBack: false,
	});

	if (pkgManager !== "skip") {
		await tasks.add([
			{
				label: `Installing dependencies with ${pkgManager}`,
				action: async () => {
					await sleep(3000); // This will also run in background
				},
			},
		]);
	}

	await note(`**Plugged in and ready to go!**

		1. \`cd ./my-plugin\`
		2. \`npm run dev\`
		3. Import \`dist/manifest.json\` in Figma

		Check the docs out at https://plugma.dev.`);

	return { answers, pkgManager };
};

(async () => {
	try {
		const result = await ask(flow);

		// console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
