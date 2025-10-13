#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	const job3 = await spinner({
		idle: "Ready to process files",
		running: "Processing files...",
		paused: "Paused (waiting for user input)",
		stopped: "All files processed!",
	});

	await job3.start();

	await sleep(1500);
	await job3.pause();
	await sleep(800);
	await job3.resume();

	await sleep(1000);
	await job3.pause();
	await sleep(600);
	await job3.resume();

	await sleep(1200);
	await job3.stop();

	// Example 1: Basic spinner with simple label
	const job1 = await spinner("Cancelling...", {
		color: "red",
		dim: true,
	});

	await job1.start();

	await sleep(800);
	await job1.pause();

	await sleep(800);
	await job1.resume();

	await sleep(800);
	await job1.stop("Cancelled!", {
		dim: false,
	});

	// Example 2: Spinner with state-specific labels
	const job2 = await spinner({
		idle: "Preparing to fetch data",
		running: "Fetching from API...",
		paused: "Waiting for rate limit",
		stopped: "Data fetched successfully",
	});

	// await sleep(500);
	await job2.start();

	await sleep(2000);
	await job2.pause();

	await sleep(1000);
	await job2.resume();

	await sleep(1500);
	await job2.stop();

	// Example 3: Simulating a long-running process

	return "All examples completed!";
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
