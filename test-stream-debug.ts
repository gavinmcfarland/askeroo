import { ask, stream, note } from "./src/index.js";

const flow = async () => {
	console.log("\n=== Starting flow ===\n");

	await note("Test: Sequential streams");

	console.log("\n--- Creating Stream 1 ---");
	const stream1 = await stream("Stream 1");
	console.log("Stream 1 created");

	await stream1.writeLine("Stream 1: Line 1");
	await new Promise((r) => setTimeout(r, 200));
	await stream1.writeLine("Stream 1: Line 2");
	await new Promise((r) => setTimeout(r, 200));

	console.log("Calling stream1.complete()");
	await stream1.complete("Stream 1 completed");
	console.log("Stream 1 complete() finished");

	await new Promise((r) => setTimeout(r, 300));

	console.log("\n--- Creating Stream 2 ---");
	const stream2 = await stream("Stream 2");
	console.log("Stream 2 created");

	await stream2.writeLine("Stream 2: Line 1");
	await new Promise((r) => setTimeout(r, 200));
	await stream2.writeLine("Stream 2: Line 2");
	await new Promise((r) => setTimeout(r, 200));

	console.log("Calling stream2.complete()");
	await stream2.complete("Stream 2 completed");
	console.log("Stream 2 complete() finished");

	await new Promise((r) => setTimeout(r, 300));

	console.log("\n=== Flow complete ===\n");
	return "Done";
};

await ask(flow);
