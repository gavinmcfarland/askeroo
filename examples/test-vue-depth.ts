#!/usr/bin/env node
import {
	ask,
	group,
	confirm,
	radio,
} from "../src/index.js";
import { conditionalAsync } from "../src/utils/depth-tracker.js";

// Test the specific Vue scenario that should show correct depths
const vueDepthFlow = async () => {
	const answers = await group(
		async () => {
			console.log("📍 Testing Vue depth scenario");

			// Force the values to trigger the exact path
			const projectType = "web";
			const framework = "vue";
			const vueVersion = "3";

			// First conditional level (depth 1) - projectType === "web"
			await conditionalAsync(projectType === "web", async () => {
				console.log("📍 Inside web conditional - depth 1");

				// Second conditional level (depth 2) - framework === "vue"
				await conditionalAsync(framework === "vue", async () => {
					console.log("📍 Inside vue conditional - should be depth 2");
					await radio({
						label: "Vue version:",
						shortLabel: "Vue Version",
						options: [
							{ value: "2", label: "Vue 2" },
							{ value: "3", label: "Vue 3" },
						],
					});

					// Third conditional level (depth 3) - vueVersion === "3"
					await conditionalAsync(vueVersion === "3", async () => {
						console.log("📍 Inside vue 3 conditional - should be depth 3");
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

console.log("🧪 Testing Vue depth scenario");
(async () => {
	try {
		const result = await ask(vueDepthFlow);
		console.log("\n📊 Test completed:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();