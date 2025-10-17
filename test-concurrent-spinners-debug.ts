#!/usr/bin/env node
import { ask, spinner } from "./src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	console.log("\n=== Creating job3 ===");
	const job3 = await spinner("Processing files...");
	console.log("job3 created, starting...");
	await job3.start();
	console.log("job3 started");

	await sleep(500);

	console.log("\n=== Creating job1 while job3 is running ===");
	const job1 = await spinner("Cancelling...", { color: "red" });
	console.log("job1 created, starting...");
	await job1.start();
	console.log("job1 started");

	console.log("\n=== Both spinners should be visible now ===");
	await sleep(1000);

	console.log("\n=== Stopping job1 ===");
	await job1.stop("Cancelled!");
	console.log("job1 stopped");

	await sleep(500);

	console.log("\n=== Creating job2 while job3 is still running ===");
	const job2 = await spinner("Fetching...");
	console.log("job2 created, starting...");
	await job2.start();
	console.log("job2 started");

	console.log("\n=== job3 and job2 should be visible now ===");
	await sleep(1000);

	console.log("\n=== Stopping job2 ===");
	await job2.stop("Fetched!");
	console.log("job2 stopped");

	await sleep(500);

	console.log("\n=== Stopping job3 ===");
	await job3.stop("Files processed!");
	console.log("job3 stopped");

	return "Done";
};

const result = await ask(flow);
console.log("\nResult:", result);
