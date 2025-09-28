#!/usr/bin/env node
import {
	ask,
	group,
	confirm,
	radio,
} from "../src/index.js";
import { conditionalAsync } from "../src/utils/depth-tracker.js";

// Test 3-level depth specifically
const depth3Flow = async () => {
	const answers = await group(
		async () => {
			console.log("📍 Starting depth 3 test");

			// Force the conditions to trigger the 3-level path
			const projectType = "web";
			const framework = "vue";
			const vueVersion = "3";

			console.log("📍 Entering level 1 conditional (projectType === 'web')");
			await conditionalAsync(projectType === "web", async () => {
				console.log("📍 Entering level 2 conditional (framework === 'vue')");
				await conditionalAsync(framework === "vue", async () => {
					console.log("📍 Entering level 3 conditional (vueVersion === '3')");
					await conditionalAsync(vueVersion === "3", async () => {
						console.log("📍 This should be depth 3:");
						await confirm({
							label: "Use Composition API?",
							shortLabel: "Composition API",
							initialValue: true,
						});
					});
				});
			});

			return { projectType, framework, vueVersion };
		},
		{ flow: "phased" }
	);

	return answers;
};

console.log("🧪 Testing 3-level depth scenario");
(async () => {
	try {
		const result = await ask(depth3Flow);
		console.log("\n📊 Test completed:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();