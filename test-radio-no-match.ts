import { radio } from "./src/index.js";

(async () => {
	console.log("Testing Radio Prompt - No Match Message");
	console.log("Instructions:");
	console.log("1. Type 'hello' to search");
	console.log("2. You should see: 'No options match \"hello\"' message\n");

	const framework = await radio({
		label: "Select a framework",
		searchable: true,
		options: [
			{ value: "react", label: "React" },
			{ value: "vue", label: "Vue" },
			{ value: "svelte", label: "Svelte" },
			{ value: "vitest", label: "Vitest" },
		],
	});

	console.log("Selected:", framework);
	process.exit(0);
})();
