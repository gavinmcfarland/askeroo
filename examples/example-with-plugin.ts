#!/usr/bin/env node

import { ask, text } from "../src/index.js";
import { multi } from "./custom-prompt-multi.js";

const flow = async () => {
	const name = await text({ message: "What's your name?" });

	// Using the custom multi-select prompt
	const colors = await multi({
		message: "Select your favorite colors",
		options: ["red", "green", "blue", "yellow", "purple"]
	});

	const email = await text({ message: "What's your email?" });

	return {
		name,
		colors,
		email,
	};
};

(async () => {
	try {
		const result = await ask(flow);

		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();