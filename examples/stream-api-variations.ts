import { ask, stream } from "../src/index.js";

/**
 * Example showing different ways to call stream()
 */

const flow = async () => {
	// 1. Just a label
	const output1 = await stream("Example 1: Just a label");
	await output1.writeLine("Simple label");
	await output1.complete();

	// 2. Label with options (original way)
	const output2 = await stream("Example 2: Label + options", {
		maxLines: 10,
		showLineNumbers: true,
	});
	await output2.writeLine("Label and options");
	await output2.complete();

	// 3. No label, but with options using undefined
	const output3 = await stream(undefined, {
		maxLines: 10,
		prefixSymbol: "▸",
	});
	await output3.writeLine("Example 3: Options only (using undefined)");
	await output3.complete();

	// 4. NEW: Options object with label inside (cleaner!)
	const output4 = await stream({
		label: "Example 4: Options object with label",
		maxLines: 10,
		showLineNumbers: true,
	});
	await output4.writeLine("Options object style");
	await output4.complete();

	// 5. NEW: Options object without label
	const output5 = await stream({
		maxLines: 5,
		prefixSymbol: "│",
	});
	await output5.writeLine("Example 5: Options object, no label");
	await output5.complete();

	// 6. No arguments at all
	const output6 = await stream();
	await output6.writeLine("Example 6: No arguments");
	await output6.complete();

	return "All API variations demonstrated!";
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
