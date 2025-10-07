#!/usr/bin/env node
import {
	ask,
	group,
	text,
	confirm,
	radio,
	multi,
	tasks,
} from "../src/index.js";
import { completedFields } from "../src/built-ins/completed-fields/index.js";
import { note } from "../src/built-ins/note/index.js";

// Sleep helper function
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const flow = async () => {
	await note(
		`[ Plugma ]{bgMagenta} [v2.1.0]{dim}

		Create a new Figma plugin in seconds`
	);

	await completedFields();

	const projectName = await text({
		shortLabel: "Project",
		label: "What is your plugin name?",
		initialValue: "my-awesome-plugin",
		onValidate: async (value) => {
			if (!value.trim()) return "Plugin name cannot be empty";
			if (!/^[a-z0-9-]+$/.test(value))
				return "Use lowercase letters, numbers, and hyphens only";
			if (value.length < 3)
				return "Plugin name must be at least 3 characters";
			return null;
		},
	});

	const answers = await group(
		async () => {
			// Collect prompts individually
			const path = await text({
				shortLabel: "Path",
				label: "Where should it be created?",
				initialValue: "./my-plugin",
				onValidate: async (value) => {
					if (!value.trim()) return "Path cannot be empty";
					if (value.includes("..")) return "Path cannot contain '..'";
					if (value === "." || value === "./" || value === "/")
						return "Please specify a folder name, not the root directory";
					if (value.includes("//"))
						return "Invalid path: double slashes not allowed";
					if (value.endsWith("/"))
						return "Path cannot end with a slash";

					// Check if the base directory exists (parent path for nested paths)
					try {
						const fs = await import("fs");
						const path = await import("path");
						const resolvedPath = path.resolve(value);
						const parentPath = path.dirname(resolvedPath);
						const stats = await fs.promises.stat(parentPath);
						if (!stats.isDirectory()) {
							return "Base directory does not exist";
						}
					} catch (error) {
						return "Base directory does not exist or is not accessible";
					}

					return null;
				},
			});

			const type = await radio({
				label: "Choose a type:",
				shortLabel: "Type",
				options: [
					{ value: "plugin", label: "Plugin" },
					{ value: "widget", label: "Widget" },
				],
			});

			const framework = await radio({
				label: "Select a framework:",
				shortLabel: "Framework",
				options: [
					{ value: "react", label: "React", color: "red" },
					{ value: "vue", label: "Vue", color: "green" },
					{ value: "svelte", label: "Svelte", color: "yellow" },
					{ value: "no-ui", label: "No UI" },
				],
			});

			const template = await radio({
				shortLabel: "Template",
				label: "Choose a template:",
				hintPosition: "inline-fixed",
				options: [
					{
						value: "default",
						label: "Default",
						hint: "Complete starter with UI and common patterns",
					},
					{
						value: "minimal",
						label: "Minimal",
						hint: "Bare-bones setup for custom implementations",
					},
					{
						value: "shape-creator",
						label: "Shape Creator",
						hint: "Example plugin that creates shapes on canvas",
					},
					{
						value: "design-tokens",
						label: "Design Tokens",
						hint: "Import/export design tokens (colors, spacing, etc.)",
					},
				],
			});

			const addons = await multi({
				shortLabel: "Addons",
				label: "Select development tools:",
				hintPosition: "inline-fixed",
				options: [
					{
						value: "tailwind",
						label: "Tailwind CSS",
						hint: "Utility-first CSS framework for rapid UI development",
					},
					{
						value: "shadcn",
						label: "shadcn/ui",
						hint: "Beautifully designed components built with Radix UI",
					},
					{
						value: "eslint",
						label: "ESLint",
						hint: "Linting tool to catch errors and enforce code style",
					},
					{
						value: "prettier",
						label: "Prettier",
						hint: "Opinionated code formatter for consistent style",
					},
					{
						value: "vitest",
						label: "Vitest",
						hint: "Blazing fast unit test framework powered by Vite",
					},
					{
						value: "husky",
						label: "Husky",
						hint: "Git hooks for running checks before commits",
					},
				],
				noneOption: { label: "Skip all" },
			});

			// Conditionally prompt for shadcn config immediately after addons
			let shadcnStyle;
			let shadcnColor;
			if (addons.includes("shadcn")) {
				await group(
					async () => {
						shadcnStyle = await radio({
							label: "Choose a component style:",
							shortLabel: "Style",
							options: [
								{
									value: "default",
									label: "Default",
									hint: "Clean, modern design",
								},
								{
									value: "new-york",
									label: "New York",
									hint: "Refined, sophisticated look",
								},
							],
							meta: {
								depth: 1,
								group: "shadcn/ui Configuration",
							},
						});

						shadcnColor = await radio({
							label: "Choose a base color:",
							shortLabel: "Color",
							options: [
								{
									value: "slate",
									label: "Slate",
									hint: "Cool and professional",
								},
								{
									value: "zinc",
									label: "Zinc",
									hint: "Neutral and balanced",
								},
								{
									value: "neutral",
									label: "Neutral",
									hint: "Pure grayscale",
								},
								{
									value: "stone",
									label: "Stone",
									hint: "Warm and earthy",
								},
							],
							meta: {
								depth: 1,
								group: "shadcn/ui Configuration",
							},
						});
					},
					{
						label: "shadcn/ui Configuration",
						flow: "phased",
					}
				);
			}

			const typescript = await confirm({
				shortLabel: "TypeScript",
				label: "Use TypeScript?",
				initialValue: true,
			});

			const strictMode = await confirm({
				shortLabel: "Strict Mode",
				label: "Enable TypeScript strict mode?",
				initialValue: true,
			});

			// Build the final answers object
			const answers = {
				path,
				type,
				framework,
				template,
				addons,
				shadcnStyle,
				shadcnColor,
				typescript,
				strictMode,
			};

			return answers;
		},
		{ label: "Project Configuration" }
	);

	const gitInit = await confirm({
		shortLabel: "Git",
		label: "Initialize git repository?",
		initialValue: true,
	});

	const installDeps = await confirm({
		shortLabel: "Install",
		label: "Install dependencies now?",
		initialValue: true,
	});

	// Setup tasks
	const setupTasks = [
		{
			label: `Creating ${answers.type} at ${answers.path}`,
			action: async () => {
				await sleep(1200);
			},
		},
		{
			label: `Scaffolding ${answers.template} template with ${answers.framework}`,
			action: async () => {
				await sleep(1500);
			},
		},
	];

	if (gitInit) {
		setupTasks.push({
			label: "Initializing git repository",
			action: async () => {
				await sleep(800);
			},
		});
	}

	if (answers.addons.length > 0) {
		setupTasks.push({
			label: `Integrating development tools`,
			action: async () => {
				await sleep(500);
			},
			concurrent: true,
			tasks: answers.addons.map((addon: string) => ({
				label: `Setting up ${addon}`,
				action: async () => {
					await sleep(Math.random() * 2000 + 800);
				},
			})),
		} as any);
	}

	const tasksResult = await tasks(setupTasks, {
		concurrent: false,
	});

	let pkgManager;
	if (installDeps) {
		pkgManager = await radio({
			label: "Choose a package manager:",
			shortLabel: "Package Manager",
			initialValue: "npm",
			options: [
				{
					value: "npm",
					label: "npm",
					hint: "Node Package Manager (default)",
				},
				{
					value: "pnpm",
					label: "pnpm",
					hint: "Fast, disk space efficient",
				},
				{
					value: "yarn",
					label: "yarn",
					hint: "Fast, reliable, and secure",
				},
				{
					value: "bun",
					label: "bun",
					hint: "All-in-one JavaScript runtime",
				},
			],
			excludeFromCompleted: true,
			hideAfterSubmit: true,
			allowBack: false,
		});

		await tasks.add([
			{
				label: `Installing dependencies with ${pkgManager}`,
				action: async () => {
					await sleep(3000);
				},
			},
		]);
	}

	await note(`✨ [Success!]{green bold} Your plugin is ready.

[Next steps:]{bold}
  1. \`cd ${answers.path}\`
  2. \`${pkgManager || "npm"} run dev\`
  3. Open Figma → Plugins → Development → Import plugin from manifest

[Documentation:]{bold} https://plugma.dev/docs`);

	return { projectName, answers, gitInit, pkgManager };
};

(async () => {
	try {
		const result = await ask(flow);

		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
