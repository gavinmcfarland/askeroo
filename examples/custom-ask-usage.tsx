import React from "react";
import { Box, Text } from "ink";
import { ask } from "../src/index.js";

// Import the plugin to register it
import "../src/plugins/custom-ask/index.js";

async function demonstrateCustomAsk() {
	console.log("🚀 Demonstrating Custom Ask Plugin Usage...\n");

	try {
		// Example 1: Using ask within the main ask function
		console.log("Example 1: Using ask with custom container");
		const result1 = await ask(async ({ ask }: any) => {
			return await ask(
				async ({ text, confirm }: any) => {
					const name = await text({ label: "What's your name?" });
					const confirmed = await confirm({
						label: `Hello ${name}! Is this correct?`,
					});
					return { name, confirmed };
				},
				{
					rootContainer: ({ children }: any) => (
						<Box
							flexDirection="column"
							borderStyle="double"
							padding={1}
						>
							<Text color="blue" bold>
								🎨 Custom Styled Container
							</Text>
							<Text color="gray" dimColor>
								─────────────────────────────
							</Text>
							{children}
							<Text color="gray" dimColor>
								─────────────────────────────
							</Text>
						</Box>
					),
				}
			);
		});

		console.log("Result 1:", result1);
		console.log("\n" + "=".repeat(50) + "\n");

		// Example 2: Using ask with different styling
		console.log("Example 2: Professional form container");
		const result2 = await ask(async ({ ask, text, multi }: any) => {
			return await ask(
				async ({ text, multi }: any) => {
					const name = await text({ label: "Full Name" });
					const skills = await multi({
						label: "Select your skills:",
						options: [
							{ value: "javascript", label: "JavaScript" },
							{ value: "typescript", label: "TypeScript" },
							{ value: "react", label: "React" },
							{ value: "node", label: "Node.js" },
						],
					});
					return { name, skills };
				},
				{
					rootContainer: ({ children }: any) => (
						<Box flexDirection="column" margin={1}>
							<Text color="green" bold>
								📋 Professional Form
							</Text>
							<Box marginTop={1} flexDirection="column">
								{children}
							</Box>
						</Box>
					),
					rootContainerProps: {
						theme: "professional",
					},
				}
			);
		});

		console.log("Result 2:", result2);
		console.log("\n" + "=".repeat(50) + "\n");

		// Example 3: Minimal container
		console.log("Example 3: Minimal indented container");
		const result3 = await ask(async ({ ask, radio }: any) => {
			return await ask(
				async ({ radio }: any) => {
					const choice = await radio({
						label: "Choose an option:",
						options: [
							{ value: "a", label: "Option A" },
							{ value: "b", label: "Option B" },
							{ value: "c", label: "Option C" },
						],
					});
					return { choice };
				},
				{
					rootContainer: ({ children }: any) => (
						<Box flexDirection="column" paddingLeft={2}>
							{children}
						</Box>
					),
				}
			);
		});

		console.log("Result 3:", result3);

		console.log("\n✅ All examples completed successfully!");
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

// Run the demonstration
demonstrateCustomAsk();
