import { ask, spinner } from "./src/index.js";

const flow = async () => {
	console.log("Creating spinner 1...");
	const s1 = await spinner("Spinner 1");
	console.log("Starting spinner 1...");
	await s1.start();
	console.log("Spinner 1 started, waiting 2 seconds...");

	await new Promise((r) => setTimeout(r, 2000));

	console.log("Creating spinner 2...");
	const s2 = await spinner("Spinner 2");
	console.log("Starting spinner 2...");
	await s2.start();
	console.log("Spinner 2 started, waiting 2 seconds...");

	await new Promise((r) => setTimeout(r, 2000));

	console.log("Stopping spinner 1...");
	await s1.stop("Done 1");
	console.log("Spinner 1 stopped");

	await new Promise((r) => setTimeout(r, 1000));

	console.log("Stopping spinner 2...");
	await s2.stop("Done 2");
	console.log("Spinner 2 stopped");

	return "Complete";
};

console.log("Starting...");
const result = await ask(flow);
console.log("Result:", result);
