#!/usr/bin/env node

// Test to verify that depth indicators are being added to labels correctly
// This will run without the interactive UI to check label modification

// Import plugins to ensure they're registered
import "../src/plugins/radio/index.js";
import "../src/plugins/text/index.js";
import { globalRegistry } from "../src/registry.js";

console.log("📋 Testing label modification with depth indicators...\n");

// Simulate the plugin processing without full UI
async function testLabelModification() {
	// Get the radio plugin from the global registry
	const radioPlugin = globalRegistry.get('radio');
	if (!radioPlugin) {
		throw new Error('Radio plugin not found');
	}

	// Test radio plugin processing
	const radioOpts = {
		label: "Choose an option:",
		shortLabel: "Choice",
		options: [
			{ value: "a", label: "Option A" },
			{ value: "b", label: "Option B" },
		],
	};

	// Test with depth 0
	const processedRadio0 = radioPlugin.prompt(radioOpts, { conditionalDepth: 0 }, "test-id");
	console.log("✅ Radio with depth 0:");
	console.log(`   Original: "${radioOpts.label}"`);
	console.log(`   Processed: "${processedRadio0.label}"`);

	// Test with depth 1
	const processedRadio1 = radioPlugin.prompt(radioOpts, { conditionalDepth: 1 }, "test-id");
	console.log("\n✅ Radio with depth 1:");
	console.log(`   Original: "${radioOpts.label}"`);
	console.log(`   Processed: "${processedRadio1.label}"`);

	// Test text plugin
	const textPlugin = globalRegistry.get('text');
	if (!textPlugin) {
		throw new Error('Text plugin not found');
	}

	const textOpts = {
		label: "Enter your name:",
		shortLabel: "Name",
		initialValue: "",
	};

	// Test with depth 1
	const processedText1 = textPlugin.prompt(textOpts, { conditionalDepth: 1 }, "test-id");
	console.log("\n✅ Text with depth 1:");
	console.log(`   Original: "${textOpts.label}"`);
	console.log(`   Processed: "${processedText1.label}"`);

	// Test with depth 2
	const processedText2 = textPlugin.prompt(textOpts, { conditionalDepth: 2 }, "test-id");
	console.log("\n✅ Text with depth 2:");
	console.log(`   Original: "${textOpts.label}"`);
	console.log(`   Processed: "${processedText2.label}"`);
}

testLabelModification().then(() => {
	console.log("\n🎉 Label modification test completed!");
	console.log("   The depth indicators [depth:N] should appear in the processed labels above.");
}).catch(error => {
	console.error("❌ Test failed:", error);
});