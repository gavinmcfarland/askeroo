#!/usr/bin/env node
import {
	ask,
	text,
	radio,
} from "../src/index.js";

// Simple test demonstrating depth tracking concept
let callCount = 0;

const demoDepth = async () => {
	console.log("📋 Demonstrating conditional depth tracking...\n");

	// This will show depth 0
	const choice = await radio({
		label: "Do you want advanced features?",
		shortLabel: "Basic Choice",
		options: [
			{ value: "yes", label: "Yes, enable advanced features" },
			{ value: "no", label: "No, keep it simple" },
		],
	});

	// Force conditional execution for demo
	if (true) {
		// This will show depth 1
		await text({
			label: "Enter your advanced setting:",
			shortLabel: "Advanced Setting",
			initialValue: "advanced-value",
		});

		// Nested conditional for depth 2
		if (true) {
			// This will show depth 2
			await text({
				label: "Enter additional configuration:",
				shortLabel: "Extra Config",
				initialValue: "extra-config",
			});
		}
	}

	return choice;
};

(async () => {
	try {
		console.log("🚀 Starting depth tracking demo...");
		const result = await ask(demoDepth);
		console.log("\n✅ Demo completed! Result:", result);
		console.log("\n📊 The labels above should show [depth:N] indicators");
		console.log("   - First radio: no depth indicator (depth 0)");
		console.log("   - Second text: [depth:1] (inside if statement)");
		console.log("   - Third text: [depth:2] (nested inside two if statements)");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();