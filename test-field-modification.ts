#!/usr/bin/env node
import { ask, text, multi } from "./src/index.js";

const testFieldModification = async () => {
	console.log("🧪 Testing Field Modification Preservation");
	console.log("=========================================");
	console.log("📝 Test Steps:");
	console.log("  1. Enter 'John' in the name field and press ENTER");
	console.log("  2. Press ESCAPE to go back to the name field");
	console.log("  3. Change the name to 'Jane' (modify the field)");
	console.log("  4. Press ESCAPE (should preserve 'Jane')");
	console.log("  5. Move forward and check the value is 'Jane'");
	console.log("  6. Press Ctrl+C to exit\n");

	try {
		const answers = await ask(
			async ({ text, multi }) => {
				const name = await text({
					label: "What's your name?",
					initialValue: "",
				});

				const colors = await multi({
					label: "What colors do you like?",
					options: [
						{ label: "Red", value: "red" },
						{ label: "Blue", value: "blue" },
						{ label: "Green", value: "green" },
					],
				});

				const age = await text({
					label: "What's your age?",
					initialValue: "",
				});

				return { name, colors, age };
			},
			{ saveOnEscape: true }
		);

		console.log("\n✅ Final Results:");
		console.log("==================");
		console.log(`Name: "${answers.name}"`);
		console.log(`Colors: ${JSON.stringify(answers.colors)}`);
		console.log(`Age: "${answers.age}"`);

		// Validation
		if (answers.name === "Jane") {
			console.log("\n🎉 SUCCESS: Modified value was preserved correctly!");
		} else if (answers.name === "John") {
			console.log("\n❌ ISSUE: Original value was preserved instead of modified value");
		} else {
			console.log(`\n❓ RESULT: Final value is "${answers.name}"`);
		}
	} catch (error) {
		console.log("\n❌ Test cancelled");
	}
};

(async () => {
	try {
		await testFieldModification();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();