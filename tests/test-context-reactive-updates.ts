#!/usr/bin/env node
/**
 * Test: Plugin State Context - Reactive Updates
 *
 * This test verifies that the new PluginStateContext provides instant,
 * reactive updates without polling.
 *
 * What to observe:
 * 1. Dynamic tasks appear INSTANTLY (not after a polling delay)
 * 2. Idle state (□) is always visible before running
 * 3. Smooth transitions with no polling jank
 * 4. No CPU spikes from constant polling
 */
import { ask, tasks } from "../src/index.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	console.log("\n🧪 Testing Plugin State Context - Reactive Updates\n");
	console.log("Watch for:");
	console.log("  ✓ Instant appearance of dynamic tasks");
	console.log("  ✓ Idle state (□) always visible first");
	console.log("  ✓ Smooth animations (no jank)\n");

	await tasks([
		{
			label: "Parent task",
			action: async () => {
				console.log("  → Adding 3 dynamic tasks rapidly...");
				await sleep(500);

				// Add tasks with NO delay between them
				// With context, they should all appear instantly
				for (let i = 1; i <= 3; i++) {
					await tasks.add([
						{
							label: `Dynamic task ${i}`,
							action: async () => {
								await sleep(1000);
							},
						},
					]);
					// No sleep between additions - testing instant reactivity!
				}

				console.log(
					"  → All tasks added (should have appeared instantly)"
				);
			},
		},
		{
			label: "Verification task",
			action: async () => {
				await sleep(500);
				console.log("  ✓ All dynamic tasks completed");
			},
		},
	]);

	return "\n✅ Test complete!\n\nExpected behavior:\n  - Dynamic tasks appeared instantly (0ms latency)\n  - Each showed idle state (□) before running\n  - Smooth animations throughout\n  - No polling delays or jank";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log(result);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();
