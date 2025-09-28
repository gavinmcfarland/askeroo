#!/usr/bin/env node
import {
	ask,
	text,
	radio,
} from "../src/index.js";

const testDepth = async () => {
	console.log("Starting test flow...");

	// This should have depth 0
	const choice = await radio({
		label: "Do you want advanced features?",
		shortLabel: "Advanced",
		options: [
			{ value: "yes", label: "Yes" },
			{ value: "no", label: "No" },
		],
	});

	// Force the conditional to execute for testing
	if (true) { // This should have depth 1
		await text({
			label: "Enter your advanced setting:",
			shortLabel: "Advanced Setting",
			initialValue: "advanced-value",
		});
	}

	return choice;
};

(async () => {
	try {
		const result = await ask(testDepth);
		console.log("Result:", result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();