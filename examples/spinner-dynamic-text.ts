#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Create spinner with initial text and style
	const job = await spinner("Preparing...", {
		style: { color: "blue" },
	});

	await sleep(1000);
	await job.start("Connecting to server...");

	await sleep(2000);
	await job.pause("Connection paused");

	await sleep(1000);
	await job.resume("Resuming connection...");

	await sleep(2000);
	await job.stop("Connection established!", { color: "green" });

	return "Done!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log(result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
