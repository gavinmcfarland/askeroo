#!/usr/bin/env node
import { ask, text } from "../src/index.js";

(async () => {
	console.log("Testing custom ask component...");
	console.log(
		"If you see a 🚀 emoji above the prompt, the component is working!\n"
	);

	const result = await ask(async ({ text }: any) => {
		const name = await text({ label: "What's your name?" });
		return { name };
	});

	console.log("\nResult:", result);
})().catch(console.error);
