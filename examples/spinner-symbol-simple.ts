#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	// Simple custom symbol example
	const job = await spinner("Loading...", {
		symbol: "🚀",
		color: "cyan",
		submitDelay: 1000,
	});

	await job.start();
	await sleep(3000);
	await job.stop("Complete!", { color: "green", symbol: "✅" });

	return "Done!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nResult:", result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
