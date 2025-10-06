#!/usr/bin/env node
import { ask, text } from "../src/index.js";

(async () => {
	console.log("Testing marginTop in ask component...");
	console.log("You should see 2 lines of space above the prompt.\n");

	const result = await ask(async ({ text }: any) => {
		const name = await text({ label: "Enter your name:" });
		return { name };
	});

	console.log("\nResult:", result);
})();
