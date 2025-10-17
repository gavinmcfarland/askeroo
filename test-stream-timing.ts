import { ask, stream, note } from "./src/index.js";

const flow = async () => {
	console.log("Creating stream 1");
	const stream1Promise = stream("Stream 1");
	console.log("Awaiting stream 1 promise");
	const stream1 = await stream1Promise;
	console.log("Stream 1 controller received");

	await stream1.writeLine("Line 1");
	console.log("Wrote line 1");

	console.log("Completing stream 1");
	await stream1.complete("Done");
	console.log("Stream 1 completed");

	// Long delay to ensure everything settles
	console.log("Waiting before stream 2...");
	await new Promise((r) => setTimeout(r, 1000));

	console.log("Creating stream 2");
	const stream2Promise = stream("Stream 2");
	console.log("Awaiting stream 2 promise");
	const stream2 = await stream2Promise;
	console.log("Stream 2 controller received");

	await stream2.writeLine("Line 1 from stream 2");
	console.log("Wrote line 1 to stream 2");

	await stream2.complete("Done 2");
	console.log("Stream 2 completed");

	return "All done";
};

const result = await ask(flow);
console.log("Result:", result);
