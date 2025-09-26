#!/usr/bin/env node
import { ask, group, text, confirm, radio } from "../src/index.js";
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
					shortLabel: "Type",
					options: [
						{ value: "react", label: "React" },
						{ value: "vue", label: "Vue" },
						{ value: "svelte", label: "Svelte" },
						{ value: "no-ui", label: "No UI" },
					],
				}),
				template: await text({
					shortLabel: "Template",
					label: "Choose a template:",
				}),
				typescript: await text({
					shortLabel: "TypeScript",
					label: "Use TypeScript?",
				}),
				setup: await text({ shortLabel: "Setup", label: "Setup" }),
			};
		},
		{ flow: "phased" }
	);

	return { answers };
};

(async () => {
	try {
		const result = await ask(flow);

		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
