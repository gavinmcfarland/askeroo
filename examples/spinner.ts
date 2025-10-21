#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	const spinner1 = await spinner("Processing files...", {
		style: { color: "blue" },
	});

	await spinner1.start();

	await sleep(2000);

	await spinner1.pause();

	await sleep(4000);

	await spinner1.resume();

	await sleep(1000);

	await spinner1.pause();

	await sleep(600);

	await spinner1.resume();

	await sleep(1200);

	// Example 1: Basic spinner with simple label
	const spinner2 = await spinner("Cancelling...", {
		style: {
			color: "red",
			dim: true,
		},
	});

	await spinner2.start();

	await sleep(2000);

	await spinner2.pause();

	await sleep(800);

	await spinner2.resume();

	await sleep(800);

	await spinner2.stop("Cancelled!", {
		dim: false,
	});

	await sleep(1000);

	// Example 2: Spinner with state-specific labels
	const spinner3 = await spinner(
		{
			idle: "Preparing to fetch data",
			running: "Fetching from API...",
			paused: "Waiting for rate limit",
			stopped: "Data fetched successfully",
		},
		{
			hideOnCompletion: true,
		}
	);

	// await sleep(500);
	await spinner3.start();

	await sleep(2000);
	await spinner3.pause();

	await sleep(1000);
	await spinner3.resume();

	await sleep(1500);
	await spinner3.stop();

	await spinner1.stop("Files processed!");
};

(async () => {
	try {
		const result = await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
