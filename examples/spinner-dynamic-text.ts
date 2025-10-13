#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Create spinner with initial text
	const job = await spinner("Preparing...");

	await sleep(1000);
	await job.start("Connecting to server...");

	await sleep(2000);
	await job.pause("Connection paused");

	await sleep(1000);
	await job.resume("Resuming connection...");

	await sleep(2000);
	await job.stop("Connection established!");

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
