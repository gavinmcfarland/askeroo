#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/plugins/multi/index.js";

const flow = async () => {
	const name = await text({ message: "Name" });

	if (name.toLowerCase() === "admin") {
		const answers = await group(
			async () => {
				return {
					email: await text({ message: "Email" }),
					password: await text({ message: "Password" }),
				};
			},
			{
				flow: "phased",
			}
		);

		return { answers };
	} else {
		const answers = await group(
			async () => {
				return {
					news: await text({ message: "Newsletter" }),
				};
			},
			{
				flow: "phased",
			}
		);

		return { answers };
	}
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
