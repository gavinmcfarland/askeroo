#!/usr/bin/env node
import {
	ask,
	group,
	text,
	radio,
} from "../src/index.js";
import { conditionalAsync } from "../src/utils/depth-tracker.js";

// Simple test to verify runtime depth tracking
const simpleDepthFlow = async () => {
	const answers = await group(
		async () => {
			// Top-level field (depth 0)
			const choice = await radio({
				label: "Enable advanced features?",
				shortLabel: "Advanced",
				options: [
					{ value: "yes", label: "Yes" },
					{ value: "no", label: "No" },
				],
			});

			// This should be depth 1
			await conditionalAsync(choice === "yes", async () => {
				await text({
					label: "Advanced setting:",
					shortLabel: "Setting",
					initialValue: "value",
				});

				// This should be depth 2
				await conditionalAsync(true, async () => {
					await text({
						label: "Nested setting:",
						shortLabel: "Nested",
						initialValue: "nested-value",
					});
				});
			});

			return { choice };
		},
		{ flow: "phased" }
	);

	return answers;
};

// Mock the flow by setting choice to "yes" to trigger conditionals
console.log("🧪 Simple Depth Test");
(async () => {
	try {
		// Override the flow to always trigger conditionals for testing
		const testFlow = async () => {
			const answers = await group(
				async () => {
					// Top-level field (depth 0)
					console.log("📍 Executing top-level field");
					const choice = "yes"; // Force yes to trigger conditionals

					// This should be depth 1
					await conditionalAsync(choice === "yes", async () => {
						console.log("📍 Inside first conditional (should be depth 1)");
						await text({
							label: "Advanced setting:",
							shortLabel: "Setting",
							initialValue: "value",
						});

						// This should be depth 2
						await conditionalAsync(true, async () => {
							console.log("📍 Inside nested conditional (should be depth 2)");
							await text({
								label: "Nested setting:",
								shortLabel: "Nested",
								initialValue: "nested-value",
							});
						});
					});

					return { choice };
				},
				{ flow: "phased" }
			);

			return answers;
		};

		const result = await ask(testFlow);
		console.log("\n📊 Test completed:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();