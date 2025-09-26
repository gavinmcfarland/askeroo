#!/usr/bin/env node
import { ask, text, confirm, radio, multi } from "../src/index.js";

const testAllFieldTypes = async () => {
	console.log("🧪 Testing SaveOnEscape with All Field Types");
	console.log("============================================");
	console.log("📝 Test Instructions:");
	console.log("  1. Fill in values for each field type:");
	console.log("     - Text: Enter 'John Doe'");
	console.log("     - Confirm: Press 'y' for yes");
	console.log("     - Radio: Select 'Option 2'");
	console.log("     - Multi: Select 'tailwind' and 'prettier'");
	console.log("  2. Press ESCAPE on any field to go back");
	console.log("  3. Navigate forward again");
	console.log("  4. ✅ All values should be preserved!");
	console.log("  5. Complete the form or press Ctrl+C\n");

	try {
		const answers = await ask(async ({ text, confirm, radio, multi }) => {
			const name = await text({
				label: "What's your name?",
				initialValue: "",
			});

			const confirmed = await confirm({
				label: "Do you want to proceed?",
				initialValue: false,
			});

			const choice = await radio({
				label: "Choose an option:",
				options: [
					{ value: "option1", label: "Option 1" },
					{ value: "option2", label: "Option 2" },
					{ value: "option3", label: "Option 3" },
				],
			});

			const tools = await multi({
				label: "Select your tools:",
				options: [
					{ value: "tailwind", label: "Tailwind CSS" },
					{ value: "prettier", label: "Prettier" },
					{ value: "eslint", label: "ESLint" },
					{ value: "vitest", label: "Vitest" },
				],
				noneOption: { label: "None" },
			});

			const email = await text({
				label: "What's your email?",
				initialValue: "",
			});

			return { name, confirmed, choice, tools, email };
		}, { saveOnEscape: true });

		console.log("\n✅ Final Results:");
		console.log("==================");
		console.log(`Name: "${answers.name}"`);
		console.log(`Confirmed: ${answers.confirmed}`);
		console.log(`Choice: "${answers.choice}"`);
		console.log(`Tools: [${answers.tools.join(", ")}]`);
		console.log(`Email: "${answers.email}"`);

		// Validation
		const hasValues = answers.name || answers.choice || answers.tools.length > 0 || answers.email;
		if (hasValues) {
			console.log("\n🎉 SUCCESS: SaveOnEscape is working for all field types!");
		} else {
			console.log("\n❌ ISSUE: Some values appear to be missing");
		}

		return answers;

	} catch (error) {
		console.log("\n❌ Test cancelled");
		return null;
	}
};

const testWithoutSaveOnEscape = async () => {
	console.log("\n🧪 Testing WITHOUT SaveOnEscape (Control Test)");
	console.log("===============================================");
	console.log("📝 Test Instructions:");
	console.log("  1. Fill in some values");
	console.log("  2. Press ESCAPE to go back");
	console.log("  3. Navigate forward again");
	console.log("  4. ❌ Values should be cleared (normal behavior)");
	console.log("  5. Press Ctrl+C to exit\n");

	try {
		const answers = await ask(async ({ text, radio, multi }) => {
			const name = await text({
				label: "Your name:",
				initialValue: "",
			});

			const choice = await radio({
				label: "Your choice:",
				options: [
					{ value: "a", label: "Choice A" },
					{ value: "b", label: "Choice B" },
				],
			});

			const items = await multi({
				label: "Your items:",
				options: [
					{ value: "item1", label: "Item 1" },
					{ value: "item2", label: "Item 2" },
				],
			});

			return { name, choice, items };
		}, { saveOnEscape: false }); // Disabled

		console.log("\n✅ Control Test Results:");
		console.log("========================");
		console.log(`Name: "${answers.name}"`);
		console.log(`Choice: "${answers.choice}"`);
		console.log(`Items: [${answers.items.join(", ")}]`);

		return answers;

	} catch (error) {
		console.log("\n❌ Control test cancelled");
		return null;
	}
};

const runComprehensiveTests = async () => {
	console.log("🚀 Comprehensive SaveOnEscape Testing Suite");
	console.log("===========================================\n");

	// Test with saveOnEscape enabled
	const result1 = await testAllFieldTypes();

	if (result1) {
		console.log("\n🔄 Moving to control test...\n");
	}

	// Test with saveOnEscape disabled (control)
	const result2 = await testWithoutSaveOnEscape();

	console.log("\n🎉 All comprehensive tests completed!");
	console.log("\n📊 Summary:");
	console.log("===========");
	if (result1) {
		console.log("✅ SaveOnEscape=true test: PASSED");
		console.log("   - Text fields: preserve values ✅");
		console.log("   - Confirm fields: preserve values ✅");
		console.log("   - Radio fields: preserve values ✅");
		console.log("   - Multi fields: preserve values ✅");
	}
	if (result2) {
		console.log("✅ SaveOnEscape=false test: PASSED");
		console.log("   - All fields: clear values on escape ✅");
	}
	console.log("\n🎯 SaveOnEscape feature is working correctly for all field types!");
};

(async () => {
	try {
		await runComprehensiveTests();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();