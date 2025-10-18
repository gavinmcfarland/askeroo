#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Set initial style with color and dim
	const job = await spinner("Processing...", {
		style: {
			color: "red",
			dim: true,
		},
	});

	await sleep(1000);

	// Only change dim to false, color should remain red
	await job.start("Starting...", { dim: false });

	await sleep(2000);

	// Add background color, should keep red color and dim: false
	await job.pause("Paused", { bgColor: "yellow" });

	await sleep(1000);

	// Only change color, should keep bgColor and dim: false
	await job.resume("Resuming...", { color: "green" });

	await sleep(2000);

	// Override everything with just dim
	await job.stop("Complete!", { dim: true });

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
