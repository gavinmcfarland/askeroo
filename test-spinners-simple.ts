#!/usr/bin/env node
import { ask, spinner } from "./src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	const job3 = await spinner("Processing files...");
	await job3.start();
	await sleep(500);

	const job1 = await spinner("Cancelling...");
	await job1.start();
	await sleep(500);

	await job1.stop("Cancelled!");
	await sleep(300);

	const job2 = await spinner("Fetching...");
	await job2.start();
	await sleep(500);

	await job2.stop("Fetched!");
	await sleep(300);

	await job3.stop("Files processed!");

	return "Done";
};

await ask(flow);
