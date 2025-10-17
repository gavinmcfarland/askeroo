import { ask, stream, text } from "./src/index.js";

const flow = async () => {
	console.log("\n=== Creating Stream 1 ===");
	const stream1 = await stream("Stream 1");
	await stream1.writeLine("Stream 1 line");
	await stream1.complete("Stream 1 done");

	console.log("\n=== Stream 1 complete, pausing ===");
	await new Promise((r) => setTimeout(r, 500));

	console.log("\n=== Creating Stream 2 ===");
	const stream2 = await stream("Stream 2");
	console.log("Stream 2 controller created");
	await stream2.writeLine("Stream 2 line");
	console.log("Stream 2 writeLine called");
	await stream2.complete("Stream 2 done");
	console.log("Stream 2 complete called");

	console.log("\n=== Returning from flow ===");
	return "Done";
};

console.log("Starting ask...");
const result = await ask(flow);
console.log("Result:", result);
