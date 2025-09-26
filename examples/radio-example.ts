#!/usr/bin/env node
import { ask, radio, text } from "../src/index.js";

const flow = async () => {
	const framework = await radio({
		label: "Choose a framework:",
		shortLabel: "Framework",
		options: [
			{ value: "react", label: "React" },
			{ value: "vue", label: "Vue.js" },
			{ value: "angular", label: "Angular" },
			{ value: "svelte", label: "Svelte" }
		]
	});

	const language = await radio({
		label: "Choose a language:",
		shortLabel: "Language",
		showNumbers: true,
		options: [
			{ value: "ts", label: "TypeScript" },
			{ value: "js", label: "JavaScript" }
		]
	});

	const features = await radio({
		label: "Select additional features (searchable):",
		shortLabel: "Features",
		searchable: true,
		options: [
			{ value: "routing", label: "Router" },
			{ value: "state", label: "State Management" },
			{ value: "testing", label: "Testing Framework" },
			{ value: "linting", label: "ESLint + Prettier" },
			{ value: "bundler", label: "Webpack/Vite" },
			{ value: "pwa", label: "Progressive Web App" },
			{ value: "ssr", label: "Server-Side Rendering" }
		]
	});

	const projectName = await text({
		label: "Project name:",
		shortLabel: "Name"
	});

	return { framework, language, features, projectName };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nProject Configuration:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();