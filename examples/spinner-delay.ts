#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Example 1: No delay (immediate submit)
	const job1 = await spinner("Quick task...", {
		style: {
			color: "blue",
		},
	});

	await job1.start();
	await sleep(1000);
	await job1.stop("Done!"); // Submits immediately

	// Example 2: With submitDelay (pause before submit)
	const job2 = await spinner("Task with delay...", {
		style: {
			color: "cyan",
		},
		submitDelay: 1500, // Wait 1.5 seconds after stopping before submitting
	});

	await job2.start();
	await sleep(2000);
	await job2.stop("Complete!", { color: "green" });
	// User will see "Complete!" for 1.5 seconds before continuing

	// Example 3: Long submitDelay to show success message
	const job3 = await spinner("Processing...", {
		style: {
			color: "yellow",
		},
		submitDelay: 2000, // Wait 2 seconds
	});

	await job3.start();
	await sleep(3000);
	await job3.stop("Success! All done!", { color: "green" });
	// Success message visible for 2 seconds

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
