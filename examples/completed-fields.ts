#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { completedFields } from "../src/plugins/completed-fields/index.js";

const flow = async () => {
	// Show completed fields after first field

	await completedFields();

	// First, let's collect some data
	const answers = await group(
		{ id: "answers" },
		async () => {
			return {
				name: await text({ label: "Name" }),
				email: await text({ label: "Email" }),
				phone: await text({ label: "Phone" }),
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
