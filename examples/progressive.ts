#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/plugins/multi/index.js";

const flow = async () => {
	const answers = await group(async () => {
		return {
			type: await text({ message: "Type" }),
			framework: await text({ message: "Framework" }),
			typescript: await text({ message: "TypeScript" }),
			template: await text({ message: "Template" }),
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
