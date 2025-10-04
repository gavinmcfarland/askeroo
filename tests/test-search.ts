#!/usr/bin/env node
import { ask, multi } from "../src/index.js";

const flow = async () => {
	console.log("Testing search functionality...");

	const result = await multi({
		label: "Type to search frameworks:",
		searchable: true,
		showNumbers: true,
		options: [
			{ value: "react", label: "React" },
			{ value: "vue", label: "Vue.js" },
			{ value: "angular", label: "Angular" },
			{ value: "svelte", label: "Svelte" },
			{ value: "solid", label: "SolidJS" },
		],
	});

	console.log("Selected:", result);
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("Selected:", result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
