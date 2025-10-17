import { ask, stream } from "../src/index.js";

/**
 * Example showing that the label is optional
 * You can create a stream without a label to just show output
 */

const flow = async () => {
	// Stream without a label - just shows output lines
	const output = await stream();

	await output.writeLine("Line 1: No label needed");
	await output.writeLine("Line 2: Just showing output");
	await output.writeLine("Line 3: Clean and simple");

	await output.complete();

	// You can also add a label later with setLabel
	const output2 = await stream();

	await output2.writeLine("Starting process...");
	await new Promise((r) => setTimeout(r, 500));

	await output2.setLabel("Now with a label!");
	await output2.writeLine("Added a label dynamically");
	await new Promise((r) => setTimeout(r, 500));

	await output2.complete("Done!");

	return "Examples completed!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
