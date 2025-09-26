#!/usr/bin/env node
import { ask, multi } from "../src/index.js";

const flow = async () => {
	console.log("Testing enhanced multi-select functionality...\n");

	// Test 1: Basic string array options (backward compatibility)
	const basicResult = await multi({
		label: "Select your favorite programming languages:",
		options: ["JavaScript", "TypeScript", "Python", "Java", "C++"],
		showNumbers: true
	});
	console.log("Basic selection:", basicResult);

	// Test 2: Rich options with value/label pairs
	const richResult = await multi({
		label: "Choose your preferred frameworks:",
		options: [
			{ value: "react", label: "React (by Meta)" },
			{ value: "vue", label: "Vue.js (Progressive Framework)" },
			{ value: "angular", label: "Angular (by Google)" },
			{ value: "svelte", label: "Svelte (Cybernetically Enhanced)" }
		],
		searchable: true,
		showNumbers: true
	});
	console.log("Rich selection:", richResult);

	// Test 3: With none option
	const noneResult = await multi({
		label: "Select additional tools (optional):",
		options: [
			{ value: "eslint", label: "ESLint" },
			{ value: "prettier", label: "Prettier" },
			{ value: "jest", label: "Jest" }
		],
		noneOption: { label: "None of these" },
		showNumbers: true
	});
	console.log("None option selection:", noneResult);
};

flow().catch(console.error);