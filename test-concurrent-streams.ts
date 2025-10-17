import { ask, stream } from "./src/index.js";

const flow = async () => {
	// Start stream 1
	const stream1 = await stream("Stream 1");
	await stream1.writeLine("Stream 1: line 1");

	// Start stream 2 while stream 1 is active
	const stream2 = await stream("Stream 2");
	await stream2.writeLine("Stream 2: line 1");

	// Complete stream 1
	await stream1.complete("Stream 1 done");

	// Complete stream 2
	await stream2.complete("Stream 2 done");

	return "Done";
};

await ask(flow);
