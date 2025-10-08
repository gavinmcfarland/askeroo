#!/usr/bin/env node
/**
 * Test to verify that dynamic tasks show their idle state consistently
 * before transitioning to running state.
 *
 * Before fix: Idle state was sometimes missed due to 100ms delay + polling race condition
 * After fix: Idle state is reliably visible due to 250ms delay allowing 2-3 poll cycles
 */
import { ask, tasks } from "../src/index.js";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	console.log("\n🧪 Testing dynamic task idle state visibility...\n");

	await tasks([
		{
			label: "Initial task",
			action: async () => {
				await sleep(500);

				// Add multiple dynamic tasks quickly
				// Each should show idle state before running
				await tasks.add([
					{
						label: "Dynamic task 1",
						action: async () => {
							await sleep(1000);
						},
					},
				]);

				await sleep(100); // Small gap

				await tasks.add([
					{
						label: "Dynamic task 2",
						action: async () => {
							await sleep(1000);
						},
					},
				]);

				await sleep(100); // Small gap

				await tasks.add([
					{
						label: "Dynamic task 3",
						action: async () => {
							await sleep(1000);
						},
					},
				]);
			},
		},
	]);

	return "✅ Test complete! Watch for idle state (□) before running state (spinner)";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();
