#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";

const flow = async () => {
	return {
		// Root level field
		rootField: await text({ label: "Root Field" }),

		// Level 1 group
		group1: await group(
			{ label: "Group 1" },
			async () => {
				return {
					field1: await text({ label: "Field1" }),
					answer1: await text({ label: "Answer1" }),

					// Level 2 nested group
					group2: await group(
						{ label: "Group 2" },
						async () => {
							return {
								field2: await text({ label: "Field 2" }),
								answer2: await text({ label: "Answer2" }),

								// Level 3 nested group
								group3: await group(
									{ label: "Group 3" },
									async () => {
										return {
											field3: await text({ label: "Field 3" }),
											answer3: await text({ label: "Answer3" }),
										};
									}
								),
							};
						}
					),
				};
			}
		),
	};
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