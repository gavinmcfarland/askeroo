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
					initialValue: "./",
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
					await sleep(1000); // 1 second delay
				},
			},
			{
				label: `Integrating chosen add-ons`,
				action: async () => {
					await sleep(3000); // 3 second delay
				},
				completeOn: "children", // Default: complete after action + all children
			},
		],
		{
			concurrent: false,
		}
	);

	await group(
		async () => {
			await radio({
				label: "Install dependencies?",
				shortLabel: "Dependencies",
				initialValue: "npm",
				options: [
					{ value: "none", label: "None" },
					{ value: "npm", label: "npm" },
					{ value: "pnpm", label: "pnpm" },
					{ value: "yarn", label: "yarn" },
					{ value: "bun", label: "bun" },
					{ value: "deno", label: "deno" },
				],
			});
		},
		{ flow: "phased" }
	);

	await tasks.add({
		label: "Installing dependencies",
		action: async () => {
			await sleep(3000); // This will also run in background
		},
	});

	await note(`**Plugged in and ready to go!**

		1. \`cd ${answers.path}\`
		2. \`npm run dev\`
		3. Import \`dist/manifest.json\` in Figma

		Check out the docs at https://plugma.dev.`);

	return { answers };
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
