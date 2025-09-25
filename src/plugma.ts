#!/usr/bin/env node
import { ask, group, text, confirm } from "./index.js";
import { multi } from "./plugins/multi/index.js";

const flow = async () => {
	const answers = await group(
		async () => {
			return {
				type: await text({ message: "Type" }),
				framework: await text({ message: "Framework" }),
				features: await multi({
					message: "Features",
					options: ["Auth", "Database", "Testing", "API"],
				}),
				typescript: await text({ message: "TypeScript" }),
				template: await text({ message: "Template" }),
				addons: await text({ message: "Add-ons" }),
				git: await text({ message: "Git" }),
			};
		},
		{
			flow: "phased",
		}
	);

	const name = await text({ message: "Name" });

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
