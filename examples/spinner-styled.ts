#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Example 1: Spinner with initial style
	const job1 = await spinner("Processing...", { color: "cyan", dim: false });

	await sleep(500);
	await job1.start();

	await sleep(2000);
	await job1.stop("Complete!", { color: "green" });

	// Example 2: Changing styles dynamically
	const job2 = await spinner("Starting task...", { color: "blue" });

	await sleep(500);
	await job2.start("Running task...", { color: "yellow" });

	await sleep(2000);
	await job2.pause("Task paused", { color: "magenta", dim: true });

	await sleep(1000);
	await job2.resume("Resuming task...", { color: "yellow" });

	await sleep(2000);
	await job2.stop("Task completed!", { color: "green" });

	// Example 3: Using background colors
	const job3 = await spinner("Important task", {
		color: "white",
		bgColor: "blue",
	});

	await sleep(500);
	await job3.start();

	await sleep(2000);
	await job3.stop("Success!", { color: "black", bgColor: "green" });

	// Example 4: Dim style
	const job4 = await spinner("Background process...", {
		color: "gray",
		dim: true,
	});

	await sleep(500);
	await job4.start();

	await sleep(2000);
	await job4.stop();

	return "All styled spinners completed!";
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
