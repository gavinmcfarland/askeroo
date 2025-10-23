#!/usr/bin/env node
import { ask, log } from "../src/index.js";

const flow = async () => {
	// Using the log object methods
	await log.info("User logged in");
	await log.warn("Memory usage is high");
	await log.error("Connection timeout");
	await log.success("Backup completed");

	// With markdown support
	await log.info(`
		## Installation Complete!

		Your application has been **successfully** installed.

		Next steps:
		-   Run \`npm start\` to begin
		-   Check the documentation
		-   Configure your settings
	`);

	return { status: "completed" };
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
