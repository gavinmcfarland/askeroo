#!/usr/bin/env node
import React, { useState } from "react";
import { Text, Box } from "ink";
import { createPrompt, ask } from "../src/index.js";

/**
 * Example: Creating a custom plugin that uses submission type system
 * 
 * This plugin demonstrates:
 * 1. Checking previous prompt's submission type
 * 2. Conditional behavior based on submission context
 * 3. Smart navigation hints
 */

interface SmartPromptOptions {
	label: string;
	showNavigationInfo?: boolean;
}

// Custom plugin that's aware of submission types
export const smartPrompt = createPrompt<SmartPromptOptions, string>({
	type: "smartPrompt",
	autoSubmit: false, // Default: manual submission

	component: ({ node, options, events }: any) => {
		const [value, setValue] = useState("");

		// NOTE: In real implementation, you would get treeManager from context
		// For this example, we'll show the concept
		const showNavInfo = options.showNavigationInfo ?? true;

		// Simulated navigation info (in real use, get from treeManager)
		const canGoBack = node.allowBack !== false;
		// const previousSubmissionType = treeManager.getPreviousNode()?.submissionType;

		return (
			<Box flexDirection="column">
				<Text>{options.label}</Text>
				<Text color="cyan">Input: {value}</Text>
				
				{showNavInfo && (
					<Box marginTop={1}>
						<Text color="gray" dimColor>
							Navigation: {canGoBack ? "↑ Back enabled" : "↑ Back disabled"}
						</Text>
					</Box>
				)}
				
				<Box marginTop={1}>
					<Text color="gray" dimColor>
						State: {node.state}
					</Text>
				</Box>
			</Box>
		);
	},
});

// Example flow using the custom plugin
const flow = async () => {
	console.log("Starting custom plugin example...\n");

	// Auto-submitted prompt (user can't go back to this)
	const autoValue = await smartPrompt({
		label: "Auto-submitted field",
		autoSubmit: true,
		showNavigationInfo: true
	});

	// Manual prompt (user can go back)
	const manualValue = await smartPrompt({
		label: "Manual submission field",
		autoSubmit: false, // Explicit
		showNavigationInfo: true
	});

	// Prompt with custom navigation rules
	const restrictedValue = await smartPrompt({
		label: "No going back from here",
		allowBack: false,
		showNavigationInfo: true
	});

	return {
		autoValue,
		manualValue,
		restrictedValue
	};
};

// Run the example
(async () => {
	try {
		const result = await ask(flow);
		console.log("\n✅ Custom plugin example completed!");
		console.log("Result:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();

