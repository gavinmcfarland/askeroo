import { ask, stream, note } from "./src/index.js";

const flow = async () => {
	await note("Testing sequential streams");

	// First stream
	const stream1 = await stream("Stream 1");
	await stream1.writeLine("Stream 1: Line 1");
	await new Promise((r) => setTimeout(r, 300));
	await stream1.writeLine("Stream 1: Line 2");
	await new Promise((r) => setTimeout(r, 300));
	await stream1.complete("Stream 1 completed");

	await new Promise((r) => setTimeout(r, 500));

	await note("First stream done, starting second stream...");

	// Second stream - this one should show but might not
	const stream2 = await stream("Stream 2");
	await stream2.writeLine("Stream 2: Line 1");
	await new Promise((r) => setTimeout(r, 300));
	await stream2.writeLine("Stream 2: Line 2");
	await new Promise((r) => setTimeout(r, 300));
	await stream2.complete("Stream 2 completed");

	await new Promise((r) => setTimeout(r, 500));

	await note("Second stream done");

	return "All done";
};

await ask(flow);
