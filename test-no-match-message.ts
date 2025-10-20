import { multi } from "./src/index.js";

(async () => {
	console.log("Testing Multi Prompt - No Match Message");
	console.log("Instructions:");
	console.log("1. Select 'Vitest' using SPACE");
	console.log("2. Type 'hello' to search");
	console.log("3. You should see: 'No options match \"hello\"' message\n");

	const frameworks = await multi({
		label: "Select frameworks",
		searchable: true,
		options: [
			{ value: "react", label: "React" },
			{ value: "vue", label: "Vue" },
			{ value: "svelte", label: "Svelte" },
			{ value: "vitest", label: "Vitest" },
		],
	});

	console.log("Selected:", frameworks);
	process.exit(0);
})();
