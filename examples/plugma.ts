#!/usr/bin/env node
import { ask, group, text, confirm, radio, multi } from "../src/index.js";
import { completedFields } from "../src/plugins/completed-fields/index.js";
import { note } from "../src/plugins/note/index.js";

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
					hintPosition: "side",
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
					options: [
						{ value: "tailwind", label: "Tailwind" },
						{ value: "shadcn", label: "Shadcn" },
						{ value: "eslint", label: "ESLint" },
						{ value: "prettier", label: "Prettier" },
						{ value: "vitest", label: "Vitest" },
						{ value: "playwright", label: "Playwright" },
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
