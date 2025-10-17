#!/usr/bin/env node
import { ask, spinner, note } from "./src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	await note("=== Test: Overlapping Spinners ===");
	await note("You should see job3 spinner start first...");

	const job3 = await spinner("Processing files...");
	await job3.start();

	await sleep(1000);
	await note("Now job1 spinner should appear alongside job3...");

	const job1 = await spinner("Cancelling...", { color: "red" });
	await job1.start();

	await sleep(1500);
	await note("Both spinners should be visible and animating now");

	await sleep(500);
	await job1.stop("Cancelled!");

	await sleep(500);
	await note("job1 stopped, job3 should still be running");

	await sleep(500);

	const job2 = await spinner("Fetching...");
	await job2.start();

	await sleep(1000);
	await note("job2 and job3 should both be visible");

	await sleep(500);
	await job2.stop("Fetched!");

	await sleep(500);
	await job3.stop("Files processed!");

	await note("✅ All spinners completed!");
	return "Test complete";
};

await ask(flow);
