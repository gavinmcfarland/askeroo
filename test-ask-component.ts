import { ask } from "./src/index.js";

async function testAskComponent() {
	console.log("Testing ask component with marginTop...\n");

	const result = await ask(async ({ text }) => {
		const name = await text({ label: "What's your name?" });
		return { name };
	});

	console.log("\nResult:", result);
	console.log("✅ If you see spacing above the text input, the fix works!");
}

testAskComponent().catch(console.error);
