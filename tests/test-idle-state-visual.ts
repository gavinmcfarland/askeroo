#!/usr/bin/env node
/**
 * Visual test to verify that dynamic tasks consistently show idle state.
 *
 * This test rapidly adds multiple dynamic tasks and each should show the idle
 * state (□) before transitioning to running state (spinner).
 *
 * With the fix, execution doesn't start until the polling mechanism detects
 * the task, ensuring the idle state is always rendered.
 */
import { ask, tasks } from "../src/index.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	console.log(
		"\n🧪 Testing idle state visibility with rapid task additions\n"
	);

	await tasks([
		{
			label: "Parent task - will add 5 dynamic tasks rapidly",
			action: async () => {
				await sleep(500);

				// Add 5 tasks in rapid succession (no delays)
				// Each should show idle state before running
				for (let i = 1; i <= 5; i++) {
					await tasks.add([
						{
							label: `Dynamic task ${i}`,
							action: async () => {
								await sleep(800);
							},
						},
					]);
				}

				console.log("✓ All 5 dynamic tasks added");
			},
		},
	]);

	return "\n✅ Test complete! All tasks should have shown idle state (□) before running.";
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
