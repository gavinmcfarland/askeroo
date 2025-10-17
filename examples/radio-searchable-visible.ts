#!/usr/bin/env node
import { ask, radio } from "../src/index.js";

// Example showing the new visible search input for radio prompt
const flow = async () => {
	const language = await radio({
		label: "Select your favorite programming language",
		options: [
			{ value: "javascript", label: "JavaScript" },
			{ value: "typescript", label: "TypeScript" },
			{ value: "python", label: "Python" },
			{ value: "rust", label: "Rust" },
			{ value: "go", label: "Go" },
			{ value: "java", label: "Java" },
			{ value: "csharp", label: "C#" },
			{ value: "cpp", label: "C++" },
			{ value: "ruby", label: "Ruby" },
			{ value: "php", label: "PHP" },
			{ value: "swift", label: "Swift" },
			{ value: "kotlin", label: "Kotlin" },
		],
		// Use 'filter' to enable filter mode (press Shift+F to activate)
		// This allows users to see what they're typing with a cursor
		searchable: "filter",
		maxVisible: 8,
	});

	return { language };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nYou selected:", result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
