#!/usr/bin/env node
import { ask } from "../src/index.js";
import { multi } from "../src/built-ins/multi/index.js";

// Example showing the new visible search input for multi prompt
const flow = async () => {
	const techStack = await multi({
		label: "Select your tech stack (use space to select)",
		options: [
			{ value: "react", label: "React" },
			{ value: "vue", label: "Vue" },
			{ value: "angular", label: "Angular" },
			{ value: "svelte", label: "Svelte" },
			{ value: "nextjs", label: "Next.js" },
			{ value: "nuxtjs", label: "Nuxt.js" },
			{ value: "gatsby", label: "Gatsby" },
			{ value: "astro", label: "Astro" },
			{ value: "nodejs", label: "Node.js" },
			{ value: "deno", label: "Deno" },
			{ value: "bun", label: "Bun" },
			{ value: "express", label: "Express" },
			{ value: "fastify", label: "Fastify" },
			{ value: "nestjs", label: "NestJS" },
		],
		// Use 'filter' to enable filter mode (press Shift+F to activate)
		// This allows users to see what they're typing with a cursor
		searchable: "filter",
		maxVisible: 8,
	});

	return { techStack };
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
