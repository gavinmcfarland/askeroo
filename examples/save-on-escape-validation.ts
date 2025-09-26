#!/usr/bin/env node
import { ask, text, confirm, multi, radio } from "../src/index.js";

const testValuePreservation = async () => {
	console.log("🧪 Testing Value Preservation with saveOnEscape");
	console.log("===============================================");
	console.log("📝 Test Instructions:");
	console.log("  1. Enter 'John' in the name field");
	console.log("  2. Press ESCAPE to go back");
	console.log("  3. Navigate forward again to the name field");
	console.log("  4. ✅ The field should show 'John' (preserved value)");
	console.log("  5. Continue to test other fields");
	console.log("  6. Press Ctrl+C to exit\n");

	try {
		const answers = await ask(
			async ({ text, confirm }) => {
				const name = await text({
					label: "What's your name?",
					initialValue: "", // Start empty
				});

				const age = await text({
					label: "What's your age?",
					initialValue: "", // Start empty
				});

				const confirmed = await confirm({
					label: "Are you sure about the details?",
					initialValue: false, // Start false
				});

				const confirmed3 = await radio({
					label: "Are you sure about the details?",
					options: [
						{ label: "Yes", value: "yes" },
						{ label: "No", value: "no" },
					],
				});

				const confirmed2 = await multi({
					label: "Are you sure about the details?",
					options: [
						{ label: "Yes", value: "yes" },
						{ label: "No", value: "no" },
					],
				});

				const age2 = await text({
					label: "What's your age?",
					initialValue: "", // Start empty
				});

				return { name, age, confirmed };
			},
			{ saveOnEscape: true }
		);

		console.log("\n✅ Final Results:");
		console.log("==================");
		console.log(`Name: "${answers.name}"`);
		console.log(`Age: "${answers.age}"`);
		console.log(`Confirmed: ${answers.confirmed}`);

		// Validation
		if (answers.name && answers.age) {
			console.log("\n🎉 SUCCESS: Values were preserved correctly!");
		} else {
			console.log("\n❌ ISSUE: Some values appear to be missing");
		}
	} catch (error) {
		console.log("\n❌ Test cancelled");
	}
};

const testValueClearingWithoutSaveOnEscape = async () => {
	console.log("\n🧪 Testing Value Clearing without saveOnEscape");
	console.log("==============================================");
	console.log("📝 Test Instructions:");
	console.log("  1. Enter 'Jane' in the name field");
	console.log("  2. Press ESCAPE to go back");
	console.log("  3. Navigate forward again to the name field");
	console.log("  4. ❌ The field should be empty (value cleared)");
	console.log("  5. Press Ctrl+C to exit\n");

	try {
		const answers = await ask(
			async ({ text, confirm }) => {
				const name = await text({
					label: "What's your name?",
					initialValue: "", // Start empty
				});

				const confirmed = await confirm({
					label: "Are you sure?",
					initialValue: false, // Start false
				});

				return { name, confirmed };
			},
			{ saveOnEscape: false }
		); // saveOnEscape disabled

		console.log("\n✅ Final Results:");
		console.log("==================");
		console.log(`Name: "${answers.name}"`);
		console.log(`Confirmed: ${answers.confirmed}`);
	} catch (error) {
		console.log("\n❌ Test cancelled");
	}
};

const runValidationTests = async () => {
	console.log("🚀 SaveOnEscape Validation Tests");
	console.log("=================================\n");

	// Test 1: Values should be preserved
	await testValuePreservation();

	// Test 2: Values should be cleared (control test)
	await testValueClearingWithoutSaveOnEscape();

	console.log("\n🎉 All validation tests completed!");
	console.log("If values were preserved in test 1 and cleared in test 2,");
	console.log("the saveOnEscape feature is working correctly! 🎯");
};

(async () => {
	try {
		await runValidationTests();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
