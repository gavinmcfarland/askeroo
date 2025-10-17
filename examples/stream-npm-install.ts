import { ask, note, stream } from "../src/index.js";
import { spawn } from "child_process";

/**
 * Example of streaming package manager output (npm and pnpm)
 *
 * This demonstrates how to stream real-time installation progress
 * from npm or pnpm to the terminal using the stream prompt.
 *
 * Features:
 * - Real-time output streaming
 * - Both stdout and stderr capture
 * - Error handling
 * - Success/failure indicators
 * - Line limiting to prevent terminal overflow
 *
 * Quick Reference:
 * - npm:  spawn("npm", ["install", "--save", ...packages])
 * - pnpm: spawn("pnpm", ["add", ...packages])
 * - yarn: spawn("yarn", ["add", ...packages])
 * - bun:  spawn("bun", ["add", ...packages])
 *
 * By default, actual installations are commented out for safety.
 * Uncomment the functions in the flow to test with real installations.
 */

async function installWithNpm(packages: string[]) {
	const output = await stream(
		`Installing ${packages.join(", ")} with npm...`,
		{
			maxLines: 20, // Only show last 20 lines
			showLineNumbers: true,
		}
	);

	return new Promise<void>((resolve, reject) => {
		// npm uses "install" or "i" command with --save flag
		const npm = spawn("npm", ["install", "--save", ...packages]);

		// Capture stdout
		npm.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		// Capture stderr (npm sends progress to stderr)
		npm.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		// Handle errors
		npm.on("error", (err) => {
			output.error(`Failed to start npm: ${err.message}`);
			reject(err);
		});

		// Handle completion
		npm.on("close", (code) => {
			if (code === 0) {
				output.complete(
					`✓ Successfully installed ${packages.length} package(s)!`
				);
				resolve();
			} else {
				output.error(`✗ Installation failed with exit code ${code}`);
				reject(new Error(`npm install failed with code ${code}`));
			}
		});
	});
}

async function installWithPnpm(packages: string[]) {
	const output = await stream(
		`Installing ${packages.join(", ")} with pnpm...`,
		{
			maxLines: 20, // Only show last 20 lines
			showLineNumbers: true,
		}
	);

	return new Promise<void>((resolve, reject) => {
		// pnpm uses "add" command (like yarn)
		const pnpm = spawn("pnpm", ["add", ...packages]);

		// Capture stdout
		pnpm.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		// Capture stderr (pnpm sends progress to stderr)
		pnpm.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		// Handle errors
		pnpm.on("error", (err) => {
			output.error(`Failed to start pnpm: ${err.message}`);
			reject(err);
		});

		// Handle completion
		pnpm.on("close", (code) => {
			if (code === 0) {
				output.complete(
					`✓ Successfully installed ${packages.length} package(s)!`
				);
				resolve();
			} else {
				output.error(`✗ Installation failed with exit code ${code}`);
				reject(new Error(`pnpm add failed with code ${code}`));
			}
		});
	});
}

const flow = async () => {
	// Example 1: Install with npm
	// await note("Installing with npm...\n");
	// await installWithNpm(["chalk"]);

	// Example 2: Install with pnpm (faster, more efficient)
	// await note("\n\nInstalling with pnpm...\n");
	await installWithPnpm(["commander"]);

	return "Example ready to use!";
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
