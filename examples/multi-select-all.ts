import { multi } from "../src/index.js";

(async () => {
	console.log(
		"Multi-select with Shift+A (select all) and Shift+D (clear all)"
	);
	console.log(
		"================================================================\n"
	);

	// Basic example
	const skills = await multi({
		label: "Select your skills (Shift+A: select all, Shift+D: clear all):",
		options: [
			"JavaScript",
			"TypeScript",
			"React",
			"Vue",
			"Angular",
			"Node.js",
			"Python",
			"Docker",
		],
	});

	console.log("\nYou selected:", skills);

	// Searchable example
	const languages = await multi({
		label: "Select programming languages (Shift+A/Shift+D to select/clear all):",
		options: [
			{ value: "js", label: "JavaScript", hint: "Web scripting" },
			{ value: "ts", label: "TypeScript", hint: "Typed JavaScript" },
			{ value: "py", label: "Python", hint: "General purpose" },
			{ value: "rb", label: "Ruby", hint: "Elegant syntax" },
			{ value: "go", label: "Go", hint: "Fast and simple" },
			{ value: "rs", label: "Rust", hint: "Memory safe" },
		],
		searchable: true,
		maxVisible: 4,
	});

	console.log("\nYou selected:", languages);

	process.exit(0);
})();
