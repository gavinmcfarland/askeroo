#!/usr/bin/env node
import { ask, radio, multi } from "../src/index.js";

const flow = async () => {
	console.log("Testing maxVisible functionality for radio and multi prompts...\n");

	// Test 1: Radio with maxVisible
	const radioResult = await radio({
		label: "Choose a framework (max 4 visible):",
		maxVisible: 4,
		options: [
			{ value: "none", label: "None" },
			{ value: "tailwind", label: "Tailwind CSS" },
			{ value: "shadcn", label: "Shadcn/UI" },
			{ value: "eslint", label: "ESLint" },
			{ value: "prettier", label: "Prettier" },
			{ value: "jest", label: "Jest" },
			{ value: "vitest", label: "Vitest" },
			{ value: "playwright", label: "Playwright" },
			{ value: "storybook", label: "Storybook" },
			{ value: "commitizen", label: "Commitizen" }
		],
		showNumbers: true
	});
	console.log("Radio selection:", radioResult);

	// Test 2: Multi with maxVisible
	const multiResult = await multi({
		label: "Select tools (max 4 visible):",
		maxVisible: 4,
		options: [
			{ value: "webpack", label: "Webpack" },
			{ value: "vite", label: "Vite" },
			{ value: "rollup", label: "Rollup" },
			{ value: "parcel", label: "Parcel" },
			{ value: "esbuild", label: "esbuild" },
			{ value: "swc", label: "SWC" },
			{ value: "babel", label: "Babel" },
			{ value: "typescript", label: "TypeScript" },
			{ value: "postcss", label: "PostCSS" },
			{ value: "sass", label: "Sass/SCSS" }
		],
		noneOption: { label: "None of these" },
		showNumbers: true
	});
	console.log("Multi selection:", multiResult);

	// Test 3: Searchable radio with maxVisible
	const searchableResult = await radio({
		label: "Choose a package manager (searchable, max 3 visible):",
		maxVisible: 3,
		searchable: true,
		options: [
			{ value: "npm", label: "npm (Node Package Manager)" },
			{ value: "yarn", label: "Yarn (Facebook)" },
			{ value: "pnpm", label: "pnpm (Performant NPM)" },
			{ value: "bun", label: "Bun (Fast All-in-One)" },
			{ value: "volta", label: "Volta (JavaScript Tool Manager)" },
			{ value: "fnm", label: "Fast Node Manager" },
			{ value: "nvm", label: "Node Version Manager" }
		]
	});
	console.log("Searchable selection:", searchableResult);

	return { radioResult, multiResult, searchableResult };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nFinal Results:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();