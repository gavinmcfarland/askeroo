#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/built-ins/multi/index.js";
import { logResult } from "../src/utils/logging.js";

const flow = async () => {
	const name = await text({ label: "Name" });

	if (name.toLowerCase() === "admin") {
		const answers = await group(
			async () => {
				return {
					email: await text({ label: "Email" }),
					password: await text({ label: "Password" }),
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
					news: await text({ label: "Newsletter" }),
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

		logResult(result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
