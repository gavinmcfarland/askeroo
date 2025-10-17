import { ask, tasks, stream, spawnWithColors } from "../src/index.js";
import type { Task } from "../src/index.js";

/**
 * Example showing stream inside task actions
 *
 * ✅ NOW WORKING!
 * Streams created inside task actions now render inline with the task.
 *
 * This demonstrates a powerful pattern where:
 * - Tasks show high-level progress (build, test, deploy)
 * - Streams show detailed output inline with the active task
 * - Perfect for build pipelines, CI/CD workflows, deployments
 *
 * Architecture:
 * - Each task is a node in the prompt tree (like groups)
 * - Prompts created in task actions become children of the task node
 * - The tree renderer displays children inline with proper indentation
 * - ANSI colors are preserved from commands (git, npm, etc.)
 */

async function runBuildWithStream() {
	const output = await stream({
		label: "Building project...",
		maxLines: 15,
	});

	// Simulate a build process with output
	const steps = [
		"Cleaning dist directory...",
		"Compiling TypeScript...",
		"  ✓ src/index.ts",
		"  ✓ src/utils.ts",
		"  ✓ src/components/App.tsx",
		"Bundling with webpack...",
		"  ✓ main.js (245 KB)",
		"  ✓ vendor.js (892 KB)",
		"Optimizing assets...",
		"  ✓ Minified JS (reduced 40%)",
		"  ✓ Compressed images (3 files)",
	];

	for (const step of steps) {
		await output.writeLine(step);
		await new Promise((r) => setTimeout(r, 200));
	}

	await output.complete("✓ Build complete!");

	// Don't let the function return immediately - keep it alive
	// This prevents the stream from being cleaned up
	await new Promise((r) => setTimeout(r, 2000));
}

async function runTestsWithStream() {
	const output = await stream({
		label: "Running tests...",
		maxLines: 15,
	});

	const tests = [
		"Starting test suite...",
		"",
		"✓ test/unit/utils.test.ts (12 passed)",
		"✓ test/unit/components.test.ts (8 passed)",
		"✓ test/integration/api.test.ts (15 passed)",
		"✓ test/integration/auth.test.ts (6 passed)",
		"",
		"Test Summary:",
		"  Total:  41 tests",
		"  Passed: 41",
		"  Failed: 0",
		"  Time:   2.4s",
	];

	for (const test of tests) {
		await output.writeLine(test);
		await new Promise((r) => setTimeout(r, 200));
	}

	await output.complete("✓ All tests passed!");
}

async function deployWithStream() {
	const output = await stream({
		label: "Deploying to production...",
		maxLines: 15,
	});

	const steps = [
		"Connecting to server...",
		"  ✓ Connected to prod-server-01",
		"Uploading files...",
		"  ↑ dist/main.js",
		"  ↑ dist/vendor.js",
		"  ↑ dist/assets/",
		"Creating backup...",
		"  ✓ Backup created: backup-2025-10-17.tar.gz",
		"Restarting services...",
		"  ✓ nginx reloaded",
		"  ✓ app server restarted",
		"Verifying deployment...",
		"  ✓ Health check passed",
	];

	for (const step of steps) {
		await output.writeLine(step);
		await new Promise((r) => setTimeout(r, 400));
	}

	await output.complete("✓ Deployment successful!");
}

async function gitStatusInTask() {
	const output = await stream({
		label: "Checking git status...",
		maxLines: 20,
	});

	return new Promise<void>((resolve, reject) => {
		const git = spawnWithColors("git", ["status"]);

		git.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		git.on("error", (err) => {
			output.error(`Git error: ${err.message}`);
			reject(err);
		});

		git.on("close", (code) => {
			if (code === 0) {
				output.complete("✓ Git status checked");
				resolve();
			} else {
				output.error("✗ Git status failed");
				reject(new Error("Git failed"));
			}
		});
	});
}

const flow = async () => {
	// Define tasks that use streaming for detailed output
	const deploymentTasks: Task[] = [
		{
			label: "Pre-deployment checks",
			action: async () => {
				// This task uses stream to show git status
				await gitStatusInTask();
			},
		},
		{
			label: "Build",
			action: async () => {
				// This task uses stream to show build output
				await runBuildWithStream();
			},
		},
		{
			label: "Test",
			action: async () => {
				// This task uses stream to show test results
				await runTestsWithStream();
			},
		},
		{
			label: "Deploy",
			action: async () => {
				// This task uses stream to show deployment steps
				await deployWithStream();
			},
		},
	];

	// Run all tasks with streaming output
	await tasks(deploymentTasks);

	return "Deployment pipeline complete!";
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
