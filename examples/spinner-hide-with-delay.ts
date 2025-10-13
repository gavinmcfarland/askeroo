#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Example 1: Hide on completion with delay (shows stopped state)
	const job1 = await spinner("Downloading file...", {
		color: "cyan",
		hideOnCompletion: true,
		submitDelay: 1500,
	});

	await sleep(500);
	await job1.start();

	await sleep(2000);
	await job1.stop("Downloaded!", { color: "green" });
	// Shows "Downloaded!" for 1.5 seconds, then disappears

	// Example 2: Hide on completion without delay (skips stopped state)
	const job2 = await spinner("Installing packages...", {
		color: "blue",
		hideOnCompletion: true,
		// No submitDelay - disappears immediately
	});

	await sleep(500);
	await job2.start();

	await sleep(2000);
	await job2.stop("Installed!", { color: "green" });
	// Disappears immediately without showing "Installed!"

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
