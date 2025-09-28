#!/usr/bin/env node
import { ask, group, text, confirm, radio, multi } from "../src/index.js";
import { note } from "../src/plugins/note/index.js";
import { conditionalAsync } from "../src/utils/depth-tracker.js";

// Helper function to log what we expect vs what we get
function logExpectedDepth(label: string, expectedDepth: number) {
	console.error(`🎯 EXPECT: "${label}" should be depth ${expectedDepth}`);
}

// Test complex nested conditional structures for depth tracking
const complexFlow = async () => {
	await note(
		"🧪 **Nested Conditionals Test** - Testing depth tracking with complex conditional structures"
	);

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

				// Second conditional level (depth 2) - React framework
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
						logExpectedDepth(
							"Enter experimental features to enable:",
							3
						);
						await text({
							label: "Enter experimental features to enable:",
							shortLabel: "Experimental Features",
							initialValue:
								"concurrent-features,server-components",
						});

						// Fourth conditional level (depth 4)
						logExpectedDepth("Enable React Server Components?", 3);
						const enableServerComponents = await confirm({
							label: "Enable React Server Components?",
							shortLabel: "Server Components",
							initialValue: true,
						});

						await conditionalAsync(
							enableServerComponents,
							async () => {
								logExpectedDepth(
									"Server components entry point:",
									4
								);
								await text({
									label: "Server components entry point:",
									shortLabel: "Server Entry",
									initialValue: "./src/app/layout.tsx",
								});
							}
						);
					});
				});

				// Alternative branch at depth 2 - Vue framework
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

					await conditionalAsync(vueVersion === "3", async () => {
						logExpectedDepth("Use Composition API?", 3);
						let useCompositionAPI = await confirm({
							label: "Use Composition API?",
							shortLabel: "Composition API",
							initialValue: true,
						});

						await conditionalAsync(useCompositionAPI, async () => {
							logExpectedDepth("Use Composition API?", 4);
							let useCompositionAPI = await confirm({
								label: "Use Composition API?",
								shortLabel: "Composition API",
								initialValue: true,
							});
						});
					});
				});
			});

			await conditionalAsync(projectType === "mobile", async () => {
				// Different conditional branch at depth 1
				logExpectedDepth("Choose mobile framework:", 1);
				framework = await radio({
					label: "Choose mobile framework:",
					shortLabel: "Mobile Framework",
					options: [
						{ value: "react-native", label: "React Native" },
						{ value: "flutter", label: "Flutter" },
						{ value: "ionic", label: "Ionic" },
					],
				});

				// Nested conditional in mobile branch (depth 2)
				if (framework === "react-native") {
					logExpectedDepth("React Native version:", 2);
					const rnVersion = await text({
						label: "React Native version:",
						shortLabel: "RN Version",
						initialValue: "0.72.0",
					});

					// Testing logical operators for conditional depth
					logExpectedDepth("Target platforms:", 2);
					const platform = await multi({
						label: "Target platforms:",
						shortLabel: "Platforms",
						options: [
							{ value: "ios", label: "iOS" },
							{ value: "android", label: "Android" },
						],
					});

					// Depth 3 with logical AND condition
					if (
						platform.includes("ios") &&
						platform.includes("android")
					) {
						logExpectedDepth(
							"Cross-platform configuration file:",
							3
						);
						await text({
							label: "Cross-platform configuration file:",
							shortLabel: "Cross-platform Config",
							initialValue: "./config/cross-platform.json",
						});
					}

					// Depth 3 with logical OR condition
					if (
						platform.includes("ios") ||
						framework === "react-native"
					) {
						logExpectedDepth(
							"Enable iOS-specific optimizations?",
							3
						);
						await confirm({
							label: "Enable iOS-specific optimizations?",
							shortLabel: "iOS Optimizations",
							initialValue: false,
						});
					}
				}
			});

			// Back to top level (depth 0)
			logExpectedDepth("Use TypeScript?", 0);
			const useTypeScript = await confirm({
				label: "Use TypeScript?",
				shortLabel: "TypeScript",
				initialValue: true,
			});

			// Conditional based on earlier choices (depth 1)
			if (useTypeScript) {
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

				// Nested in TypeScript section (depth 2)
				if (tsConfig === "custom") {
					logExpectedDepth("Custom tsconfig.json path:", 2);
					await text({
						label: "Custom tsconfig.json path:",
						shortLabel: "Custom TS Config",
						initialValue: "./tsconfig.custom.json",
					});
				}

				// Complex conditional combining multiple variables (depth 2)
				if (
					projectType === "web" &&
					framework === "react" &&
					tsConfig === "strict"
				) {
					logExpectedDepth(
						"Enable strict null checks for React components?",
						2
					);
					await confirm({
						label: "Enable strict null checks for React components?",
						shortLabel: "Strict Null Checks",
						initialValue: true,
					});
				}
			}

			// Ternary operator conditional (should be depth 1)
			logExpectedDepth("Build tool for web:", 1);
			const buildTool =
				projectType === "web"
					? await radio({
							label: "Build tool for web:",
							shortLabel: "Build Tool",
							options: [
								{ value: "vite", label: "Vite" },
								{ value: "webpack", label: "Webpack" },
								{ value: "rollup", label: "Rollup" },
							],
					  })
					: "native";

			// Switch-like structure using multiple if-else (various depths)
			let additionalConfig;
			if (projectType === "web") {
				logExpectedDepth("Web-specific config:", 1);
				additionalConfig = await text({
					label: "Web-specific config:",
					shortLabel: "Web Config",
					initialValue: "web-config.json",
				});
			} else if (projectType === "mobile") {
				logExpectedDepth("Mobile-specific config:", 1);
				additionalConfig = await text({
					label: "Mobile-specific config:",
					shortLabel: "Mobile Config",
					initialValue: "mobile-config.json",
				});
			} else if (projectType === "desktop") {
				logExpectedDepth("Desktop-specific config:", 1);
				additionalConfig = await text({
					label: "Desktop-specific config:",
					shortLabel: "Desktop Config",
					initialValue: "desktop-config.json",
				});
			}

			return {
				projectType,
				framework,
				useTypeScript,
				buildTool,
				additionalConfig,
			};
		},
		{ flow: "phased" }
	);

	await note(`🎉 **Test Complete!**

**Results:**
- Project: ${answers.projectType}
- Framework: ${answers.framework || "N/A"}
- TypeScript: ${answers.useTypeScript ? "Yes" : "No"}
- Build Tool: ${answers.buildTool}

**Expected Depth Indicators:**
- Top-level fields: No depth indicator
- First conditional level: [depth:1]
- Second conditional level: [depth:2]
- Third conditional level: [depth:3]
- Fourth conditional level: [depth:4]

Check the labels above to verify depth tracking is working correctly!`);

	return answers;
};

(async () => {
	try {
		const result = await ask(complexFlow);
		console.log("\n📊 Final result:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();
