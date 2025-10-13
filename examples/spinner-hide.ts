#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Example 1: Spinner that hides on completion
	const job1 = await spinner("Downloading file...", {
		color: "cyan",
		hideOnCompletion: true,
		submitDelay: 1000,
	});

	await sleep(500);
	await job1.start();

	await sleep(2000);
	await job1.stop("Downloaded!", { color: "green" });

	// Example 2: Another spinner that shows after completion
	const job2 = await spinner("Installing packages...", {
		color: "blue",
		hideOnCompletion: false, // Default behavior
	});

	await sleep(500);
	await job2.start();

	await sleep(2000);
	await job2.stop("Installed!", { color: "green" });

	// This spinner remains visible
	await sleep(1000);

	return "All tasks completed!";
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
