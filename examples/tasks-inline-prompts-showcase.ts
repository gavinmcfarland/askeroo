import { ask, tasks, stream, spinner, note } from "../src/index.js";
import type { Task } from "../src/index.js";

/**
 * Showcase of inline prompts within tasks
 *
 * This example demonstrates all the ways you can use prompts
 * inside task actions for detailed progress reporting.
 */

const flow = async () => {
	const showcaseTasks: Task[] = [
		{
			label: "Task 1: Stream Example",
			action: async () => {
				const output = await stream({
					label: "Streaming build output...",
					maxLines: 10,
				});

				await output.writeLine("Cleaning output directory...");
				await new Promise((r) => setTimeout(r, 300));

				await output.writeLine("Compiling TypeScript...");
				await new Promise((r) => setTimeout(r, 400));

				await output.writeLine("  ✓ src/index.ts");
				await output.writeLine("  ✓ src/utils.ts");
				await new Promise((r) => setTimeout(r, 300));

				await output.writeLine("Bundling assets...");
				await new Promise((r) => setTimeout(r, 400));

				await output.complete("✓ Build complete!");
			},
		},
		{
			label: "Task 2: Spinner Example",
			action: async () => {
				const spin = await spinner("Processing files...");

				await spin.start();
				await new Promise((r) => setTimeout(r, 1000));

				await spin.start("Processing... (50%)");
				await new Promise((r) => setTimeout(r, 1000));

				await spin.stop("✓ All files processed!");
			},
		},
		{
			label: "Task 3: Note Example",
			action: async () => {
				await note("📝 This is a note inside a task");
				await new Promise((r) => setTimeout(r, 500));

				await note("💡 You can use notes for instructions or info");
				await new Promise((r) => setTimeout(r, 500));

				await note("✅ Notes render inline with tasks!");
			},
		},
		{
			label: "Task 4: Multiple Prompts",
			action: async () => {
				await note("Starting complex task...");
				await new Promise((r) => setTimeout(r, 300));

				const spin = await spinner("Initializing...");
				await spin.start();
				await new Promise((r) => setTimeout(r, 800));
				await spin.stop("✓ Initialized");

				const output = await stream({
					label: "Running commands...",
					maxLines: 5,
				});

				await output.writeLine("$ command1");
				await new Promise((r) => setTimeout(r, 300));
				await output.writeLine("✓ Success");
				await new Promise((r) => setTimeout(r, 300));
				await output.writeLine("$ command2");
				await new Promise((r) => setTimeout(r, 300));
				await output.writeLine("✓ Success");
				await output.complete();

				await note("✅ All commands completed!");
			},
		},
		{
			label: "Task 5: With Subtasks",
			tasks: [
				{
					label: "Subtask A",
					action: async () => {
						const out = await stream("Processing A...");
						await out.writeLine("Step 1");
						await new Promise((r) => setTimeout(r, 300));
						await out.writeLine("Step 2");
						await new Promise((r) => setTimeout(r, 300));
						await out.complete("✓ A complete");
					},
				},
				{
					label: "Subtask B",
					action: async () => {
						const spin = await spinner("Processing B...");
						await spin.start();
						await new Promise((r) => setTimeout(r, 800));
						await spin.stop("✓ B complete");
					},
				},
			],
		},
	];

	await tasks(showcaseTasks);

	return "✅ Showcase complete! All prompts rendered inline with tasks.";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
