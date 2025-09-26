#!/usr/bin/env node
import { ask, group, text, confirm, AskOptions } from "../src/index.js";

const testSaveOnEscape = async (saveOnEscape: boolean) => {
	console.log(`\n🧪 Testing saveOnEscape: ${saveOnEscape}`);
	console.log("📝 Instructions:");
	console.log("  1. Enter some text in each field");
	console.log("  2. Press ESCAPE to go back");
	console.log("  3. Navigate forward again");
	if (saveOnEscape) {
		console.log("  4. ✅ Values should be preserved when you navigate back");
	} else {
		console.log("  4. ❌ Values should be cleared when you navigate back");
	}
	console.log("  5. Press Ctrl+C to exit and try next mode\n");

	try {
		const answers = await ask(async ({ text, confirm }) => {
			return {
				name: await text({
					label: "What's your name?",
					initialValue: "",
				}),
				age: await text({
					label: "What's your age?",
					initialValue: "",
				}),
				confirmed: await confirm({
					label: "Are you sure about the details?",
					initialValue: false,
				}),
				email: await text({
					label: "What's your email?",
					initialValue: "",
				}),
			};
		}, { saveOnEscape });

		console.log(`\n✅ Completed with saveOnEscape=${saveOnEscape}:`, answers);
		return answers;
	} catch (error) {
		console.log(`\n❌ Cancelled saveOnEscape=${saveOnEscape}`);
		return null;
	}
};

const testGroupSaveOnEscape = async () => {
	console.log(`\n🧪 Testing saveOnEscape at group level`);
	console.log("📝 Instructions:");
	console.log("  1. First group has saveOnEscape=false (values cleared on escape)");
	console.log("  2. Second group has saveOnEscape=true (values preserved on escape)");
	console.log("  3. Test both groups to see the difference\n");

	try {
		const answers = await ask(async ({ group, text, confirm }) => {
			return {
				userInfo: await group(
					{
						message: "User Information (saveOnEscape=false)",
						saveOnEscape: false,
					},
					async () => {
						return {
							name: await text({
								label: "Your name:",
								initialValue: "",
							}),
							age: await text({
								label: "Your age:",
								initialValue: "",
							}),
						};
					}
				),
				preferences: await group(
					{
						message: "Preferences (saveOnEscape=true)",
						saveOnEscape: true,
					},
					async () => {
						return {
							theme: await text({
								label: "Preferred theme:",
								initialValue: "",
							}),
							notifications: await confirm({
								label: "Enable notifications?",
								initialValue: false,
							}),
						};
					}
				),
			};
		});

		console.log(`\n✅ Completed group test:`, answers);
		return answers;
	} catch (error) {
		console.log(`\n❌ Cancelled group test`);
		return null;
	}
};

const runTests = async () => {
	console.log("🚀 SaveOnEscape Testing Suite");
	console.log("=============================");

	// Test global saveOnEscape settings
	console.log("\n📋 Testing Global SaveOnEscape Settings:");

	const result1 = await testSaveOnEscape(false);
	if (!result1) {
		console.log("🔄 Moving to next test...\n");
	}

	const result2 = await testSaveOnEscape(true);
	if (!result2) {
		console.log("🔄 Moving to next test...\n");
	}

	// Test group-level saveOnEscape settings
	console.log("\n📋 Testing Group-Level SaveOnEscape Settings:");
	const result3 = await testGroupSaveOnEscape();
	if (!result3) {
		console.log("🔄 Test completed...\n");
	}

	console.log("🎉 All saveOnEscape tests completed!");
};

(async () => {
	try {
		await runTests();
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();