#!/usr/bin/env node
import { ask, group, text, confirm } from "./index.js";
import { multi } from "./plugins/multi/index.js";

const flow = async () => {
	const first = await text({ message: "First" });
	const last = await text({ message: "Last" });
	const answers = await group(
		async () => {
			return {
				type: await text({ message: "Type" }),
				framework: await text({ message: "Framework" }),
				typescript: await text({ message: "TypeScript" }),
				template: await text({ message: "Template" }),
				addons: await text({ message: "Add-ons" }),
			};
		},
		{ message: "Static", flow: "static" }
	);

	const first2 = await text({ message: "First" });
	const last2 = await text({ message: "Last" });

	return { answers, first2, last2 };
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
