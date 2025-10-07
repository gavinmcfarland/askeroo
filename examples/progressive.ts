#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/built-ins/multi/index.js";

const flow = async () => {
	const answers = await group(async () => {
		return {
			type: await text({ label: "Type" }),
			framework: await text({ label: "Framework" }),
			typescript: await text({ label: "TypeScript" }),
			template: await text({ label: "Template" }),
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
