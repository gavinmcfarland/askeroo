#!/usr/bin/env node
import { ask, confirm } from "./src/index.js";

const testConfirmField = async () => {
	console.log("🧪 Testing ONLY Confirm Field");
	console.log("=============================");
	console.log("📝 Test Steps:");
	console.log("  1. Press 'y' to select YES");
	console.log("  2. Press ENTER to proceed");
	console.log("  3. Press ESCAPE to go back");
	console.log("  4. Press 'n' to select NO (modify the field)");
	console.log("  5. Press ESCAPE (should preserve 'NO')");
	console.log("  6. Press ENTER to complete");

	try {
		const result = await ask(
			async ({ confirm }) => {
				const confirmed = await confirm({
					message: "Do you confirm?",
					initialValue: false,
				});

				console.log(`\n📋 Selected value: ${confirmed}`);
				return { confirmed };
			},
			{ saveOnEscape: true }
		);

		console.log("\n✅ Final Result:");
		console.log("================");
		console.log(`Confirmed: ${result.confirmed}`);

		if (result.confirmed === false) {
			console.log("\n🎉 SUCCESS: Modified value 'NO' was preserved!");
		} else if (result.confirmed === true) {
			console.log("\n❌ ISSUE: Original value 'YES' was preserved instead of 'NO'");
		}
	} catch (error) {
		console.log("\n❌ Test cancelled");
	}
};

(async () => {
	try {
		await testConfirmField();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();