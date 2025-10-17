import { ask, stream, note } from "./src/index.js";

const flow = async () => {
	await note("Test: Check tree state");

	const stream1 = await stream("Stream 1");
	await stream1.writeLine("Stream 1: Line 1");
	await new Promise((r) => setTimeout(r, 200));
	await stream1.complete("Stream 1 completed");

	// Small delay
	await new Promise((r) => setTimeout(r, 200));

	// Check what's in the tree at this point
	console.log("\n=== After Stream 1 completes ===");
	console.log("About to create Stream 2...\n");

	const stream2 = await stream("Stream 2");
	await stream2.writeLine("Stream 2: Line 1");
	await new Promise((r) => setTimeout(r, 200));
	await stream2.complete("Stream 2 completed");

	await note("Done");
	return "Complete";
};

await ask(flow);
