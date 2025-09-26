#!/usr/bin/env node
import { ask, text, note } from "../src/index.js";

const flow = async () => {
	await note("Welcome to the setup wizard!");

	const name = await text({ label: "Name" });

	await note("Great! Let's continue with more details.");

	const email = await text({ label: "Email" });

	await note("All done! Processing your information...");

	return { name, email };
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