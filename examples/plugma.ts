#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/plugins/multi/index.js";

const flow = async () => {
	const answers = await group(async () => {
		return {
			type: await text({ shortLabel: "Type", label: "Choose a type:" }),
			framework: await text({
				shortLabel: "Framework",
				label: "Choose a framework:",
			}),
			template: await text({
				shortLabel: "Template",
				label: "Pick a template to start from:",
			}),
			typescript: await text({
				shortLabel: "TypeScript",
				label: "Use TypeScript?",
			}),
			setup: await text({ shortLabel: "Setup", label: "Setup" }),
		};
	});

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
