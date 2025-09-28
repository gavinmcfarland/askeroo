#!/usr/bin/env node
import {
	ask,
	group,
	text,
	confirm,
	radio,
} from "../src/index.js";
import { note } from "../src/plugins/note/index.js";
import { conditionalAsync } from "../src/utils/depth-tracker.js";

// Helper function to log what we expect vs what we get
function logExpectedDepth(label: string, expectedDepth: number) {
	console.error(`🎯 EXPECT: "${label}" should be depth ${expectedDepth}`);
}

// Test runtime depth tracking with explicit conditional wrappers
const runtimeDepthFlow = async () => {
	await note("🧪 **Runtime Depth Test** - Testing runtime depth tracking with explicit conditional helpers");

	const answers = await group(
		async () => {
			// Top-level field (depth 0)
			logExpectedDepth("What type of project?", 0);
			const projectType = await radio({
				label: "What type of project?",
				shortLabel: "Project Type",
				options: [
					{ value: "web", label: "Web Application" },
					{ value: "mobile", label: "Mobile App" },
					{ value: "desktop", label: "Desktop App" },
				],
			});

			// First conditional level (depth 1)
			let framework;
			await conditionalAsync(projectType === "web", async () => {
				logExpectedDepth("Choose web framework:", 1);
				framework = await radio({
					label: "Choose web framework:",
					shortLabel: "Web Framework",
					options: [
						{ value: "react", label: "React" },
						{ value: "vue", label: "Vue" },
						{ value: "angular", label: "Angular" },
						{ value: "svelte", label: "Svelte" },
					],
				});

				// Second conditional level (depth 2) - React branch
				await conditionalAsync(framework === "react", async () => {
					logExpectedDepth("React version:", 2);
					const reactVersion = await radio({
						label: "React version:",
						shortLabel: "React Version",
						options: [
							{ value: "18", label: "React 18" },
							{ value: "19", label: "React 19 (experimental)" },
						],
					});

					// Third conditional level (depth 3)
					await conditionalAsync(reactVersion === "19", async () => {
						logExpectedDepth("Enter experimental features:", 3);
						await text({
							label: "Enter experimental features:",
							shortLabel: "Experimental Features",
							initialValue: "concurrent-features",
						});
					});
				});

				// Second conditional level (depth 2) - Vue branch
				await conditionalAsync(framework === "vue", async () => {
					logExpectedDepth("Vue version:", 2);
					const vueVersion = await radio({
						label: "Vue version:",
						shortLabel: "Vue Version",
						options: [
							{ value: "2", label: "Vue 2" },
							{ value: "3", label: "Vue 3" },
						],
					});

					// Third conditional level (depth 3)
					await conditionalAsync(vueVersion === "3", async () => {
						logExpectedDepth("Use Composition API?", 3);
						await confirm({
							label: "Use Composition API?",
							shortLabel: "Composition API",
							initialValue: true,
						});
					});
				});
			});

			// Back to top level (depth 0)
			logExpectedDepth("Use TypeScript?", 0);
			const useTypeScript = await confirm({
				label: "Use TypeScript?",
				shortLabel: "TypeScript",
				initialValue: true,
			});

			// First conditional level based on TypeScript choice (depth 1)
			await conditionalAsync(useTypeScript, async () => {
				logExpectedDepth("TypeScript configuration:", 1);
				const tsConfig = await radio({
					label: "TypeScript configuration:",
					shortLabel: "TS Config",
					options: [
						{ value: "strict", label: "Strict mode" },
						{ value: "loose", label: "Loose mode" },
						{ value: "custom", label: "Custom configuration" },
					],
				});

				// Second conditional level (depth 2)
				await conditionalAsync(tsConfig === "custom", async () => {
					logExpectedDepth("Custom tsconfig.json path:", 2);
					await text({
						label: "Custom tsconfig.json path:",
						shortLabel: "Custom TS Config",
						initialValue: "./tsconfig.custom.json",
					});
				});
			});

			return {
				projectType,
				framework,
				useTypeScript,
			};
		},
		{ flow: "phased" }
	);

	await note(`🎉 **Runtime Depth Test Complete!**

**Results:**
- Project: ${answers.projectType}
- Framework: ${answers.framework || "N/A"}
- TypeScript: ${answers.useTypeScript ? "Yes" : "No"}

**Expected Depth Indicators:**
- Top-level fields: No depth indicator
- First conditional level: [depth:1]
- Second conditional level: [depth:2]
- Third conditional level: [depth:3]

Check the labels above to verify runtime depth tracking is working correctly!`);

	return answers;
};

(async () => {
	try {
		const result = await ask(runtimeDepthFlow);
		console.log("\n📊 Final result:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();