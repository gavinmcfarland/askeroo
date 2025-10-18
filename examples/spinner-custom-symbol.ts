#!/usr/bin/env node
import { ask, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	console.log("=== Custom Spinner Symbol Examples ===\n");

	// Example 1: Simple string symbol (replaces running animation)
	console.log("Example 1: Simple string symbol");
	const s1 = await spinner("Loading with custom symbol...", {
		style: {
			symbol: "🔄",
		},
		submitDelay: 1000,
	});
	await s1.start();
	await sleep(2000);
	await s1.stop("Done!");

	// Example 2: Custom symbols for all states
	console.log("\nExample 2: Custom symbols for all states");
	const s2 = await spinner("Processing...", {
		style: {
			symbol: {
				idle: "⚪",
				running: "🔵",
				paused: "🟡",
				stopped: "🟢",
			},
		},
		submitDelay: 1000,
	});
	await s2.start();
	await sleep(1500);
	await s2.pause("Paused");
	await sleep(1500);
	await s2.resume("Resuming");
	await sleep(1500);
	await s2.stop("Completed!");

	// Example 3: Animated custom symbols using an array
	console.log("\nExample 3: Animated custom symbols");
	const s3 = await spinner("Syncing...", {
		style: {
			symbol: {
				idle: "⭕",
				running: ["◐", "◓", "◑", "◒"],
				stopped: "✓",
			},
		},
		submitDelay: 1000,
	});
	await s3.start();
	await sleep(3000);
	await s3.stop("Synced!");

	// Example 4: Changing symbol dynamically via style
	console.log("\nExample 4: Changing symbol dynamically");
	const s4 = await spinner("Downloading...", {
		style: {
			symbol: "⬇️",
		},
		submitDelay: 1000,
	});
	await s4.start();
	await sleep(2000);
	await s4.start("Uploading...", { symbol: "⬆️" });
	await sleep(2000);
	await s4.stop("Transfer complete!", { symbol: "✔️" });

	// Example 5: Moon phases animation
	console.log("\nExample 5: Moon phases animation");
	const s5 = await spinner("Waiting for moonlight...", {
		style: {
			symbol: {
				running: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"],
				stopped: "🌕",
			},
		},
		submitDelay: 1000,
	});
	await s5.start();
	await sleep(4000);
	await s5.stop("Moon is full!");

	console.log("\nAll examples completed!");
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
