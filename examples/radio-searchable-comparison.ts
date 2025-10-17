#!/usr/bin/env node
import { ask, radio } from "../src/index.js";

// Example comparing hidden vs visible search input
const flow = async () => {
	console.log("First, try the hidden search (searchable: true):");
	console.log("→ Just type to search, no visible input field\n");

	const color1 = await radio({
		label: "Select a color (hidden search)",
		options: [
			{ value: "red", label: "Red" },
			{ value: "blue", label: "Blue" },
			{ value: "green", label: "Green" },
			{ value: "yellow", label: "Yellow" },
			{ value: "purple", label: "Purple" },
			{ value: "orange", label: "Orange" },
		],
		searchable: true, // Hidden search - no visible input
	});

	console.log("\nYou selected:", color1);
	console.log("\n---\n");
	console.log("Now, try filter mode (searchable: 'filter'):");
	console.log(
		"→ Press Shift+F to activate filter mode with a visible input field\n"
	);

	const color2 = await radio({
		label: "Select a color (filter mode)",
		options: [
			{ value: "red", label: "Red" },
			{ value: "blue", label: "Blue" },
			{ value: "green", label: "Green" },
			{ value: "yellow", label: "Yellow" },
			{ value: "purple", label: "Purple" },
			{ value: "orange", label: "Orange" },
		],
		searchable: "filter", // Filter mode - press Shift+F to activate
	});

	return { color1, color2 };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nFinal results:", result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
