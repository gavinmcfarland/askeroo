import { ask, note, stream, spawnWithColors } from "../src/index.js";
import { spawn } from "child_process";

/**
 * Real-world example: npm install with streaming output
 *
 * This example demonstrates:
 * - Real npm command execution with child_process spawn
 * - Streaming output where only last N lines are visible
 * - Label updates on complete/error (not new lines!)
 * - How write() handles chunked data from npm
 *
 * IMPORTANT: NPM Output Buffering
 * --------------------------------
 * npm buffers output when it detects it's not running in an interactive terminal.
 * This means output may appear all at once at the end instead of streaming in real-time.
 *
 * Solutions:
 * 1. Environment variables (used in npm example) - helps but not always perfect
 * 2. Use spawnWithColors (see pnpm example) - auto-uses node-pty if available
 * 3. Install node-pty for true unbuffered output: `npm install node-pty`
 * 4. Use --loglevel=verbose (npm) or --reporter=append-only (pnpm) flags
 * 5. For guaranteed streaming, see stream-real-time-demo.ts with bash commands
 */

/**
 * Install packages using npm with streamed output
 * Only shows the last 10 lines of output to keep terminal clean
 */
async function installPackagesWithNpm(packages: string[]) {
	// Create stream with label and maxLines
	const output = await stream(`Installing ${packages.join(", ")}...`, {
		maxLines: 10, // Only show last 10 lines - npm can be verbose!
		showLineNumbers: true,
	});

	return new Promise<void>((resolve, reject) => {
		// Spawn npm install command with environment variables to force unbuffered output
		// Using --loglevel=verbose generates more output which streams better
		const npm = spawn(
			"npm",
			["install", "--save", "--loglevel=verbose", ...packages],
			{
				env: {
					...process.env,
					// Force npm to think it's in a TTY to get real-time output
					FORCE_COLOR: "1",
					NPM_CONFIG_COLOR: "always",
					NPM_CONFIG_PROGRESS: "true",
				},
			}
		);

		// Capture stdout - npm sends installation progress here
		npm.stdout.on("data", (data) => {
			// write() handles chunked data and splits into lines automatically
			output.write(data.toString());
		});

		// Capture stderr - npm also sends progress info to stderr
		npm.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		// Handle spawn errors (e.g., npm not found)
		npm.on("error", (err) => {
			// error() updates the label with red X - no new line!
			output.error(`Failed to start npm: ${err.message}`);
			reject(err);
		});

		// Handle process completion
		npm.on("close", (code) => {
			if (code === 0) {
				// complete() updates the label with green checkmark - no new line!
				output.complete(
					`Successfully installed ${packages.length} package(s)!`
				);
				resolve();
			} else {
				// error() updates the label with red X - no new line!
				output.error(`Installation failed (exit code ${code})`);
				reject(new Error(`npm install failed with code ${code}`));
			}
		});
	});
}

/**
 * Install packages using pnpm with colored output
 * Shows how spawnWithColors preserves ANSI colors
 */
async function installPackagesWithPnpm(packages: string[]) {
	const output = await stream(
		`Installing ${packages.join(", ")} with pnpm...`,
		{
			maxLines: 15, // Show last 15 lines
			showLineNumbers: false, // No line numbers for cleaner output
			prefixSymbol: "│", // Add a nice prefix
		}
	);

	return new Promise<void>((resolve, reject) => {
		// Use spawnWithColors to preserve terminal colors
		// Add --reporter=append-only to get better streaming output
		const pnpm = spawnWithColors("pnpm", [
			"add",
			"--reporter=append-only",
			...packages,
		]);

		let hasOutput = false;

		pnpm.stdout.on("data", (data) => {
			hasOutput = true;
			output.write(data.toString());
		});

		pnpm.stderr.on("data", (data) => {
			hasOutput = true;
			output.write(data.toString());
		});

		pnpm.on("error", (err) => {
			output.error(`Failed to start pnpm: ${err.message}`);
			reject(err);
		});

		pnpm.on("close", async (code) => {
			// If no output was captured, it might have been buffered or package already installed
			if (!hasOutput) {
				await output.writeLine(
					"(No output captured - package may already be installed)"
				);
			}

			if (code === 0) {
				await output.complete(
					`Installed ${packages.length} package(s) with pnpm!`
				);
				resolve();
			} else {
				await output.error(`pnpm failed (exit code ${code})`);
				reject(new Error(`pnpm add failed with code ${code}`));
			}
		});
	});
}

/**
 * Example: Simulate verbose npm output showing line limiting
 * This demonstrates how maxLines keeps only the most recent output visible
 */
async function simulateVerboseNpmOutput() {
	const output = await stream("Simulating verbose npm output...", {
		maxLines: 10, // Only last 10 lines visible
		showLineNumbers: true,
	});

	// Simulate npm outputting many lines during installation
	// (Real npm can output 50+ lines for a single package install)
	await output.writeLine("npm info using npm@10.2.3");
	await output.writeLine("npm info using node@v20.10.0");
	await new Promise((r) => setTimeout(r, 100));

	await output.writeLine(
		"npm http fetch GET 200 https://registry.npmjs.org/chalk 145ms"
	);
	await new Promise((r) => setTimeout(r, 100));

	// Simulate many dependency resolution lines
	for (let i = 1; i <= 25; i++) {
		await output.writeLine(
			`npm http fetch GET 200 https://registry.npmjs.org/package-${i} ${
				50 + i * 2
			}ms`
		);
		await new Promise((r) => setTimeout(r, 80));
	}

	await output.writeLine("");
	await output.writeLine("added 25 packages, and audited 26 packages in 3s");
	await output.writeLine("found 0 vulnerabilities");

	// Label updates to show completion - no new line added!
	await output.complete("✓ Installation complete!");
}

/**
 * Example showing error handling
 */
async function simulateNpmError() {
	const output = await stream("Installing non-existent package...", {
		maxLines: 8,
	});

	await output.writeLine("npm info using npm@10.2.3");
	await new Promise((r) => setTimeout(r, 100));

	await output.writeLine(
		"npm http fetch GET 404 https://registry.npmjs.org/this-package-definitely-does-not-exist 234ms"
	);
	await new Promise((r) => setTimeout(r, 300));

	await output.writeLine("npm ERR! code E404");
	await output.writeLine(
		"npm ERR! 404 Not Found - GET https://registry.npmjs.org/this-package-definitely-does-not-exist"
	);
	await output.writeLine("npm ERR! 404");
	await output.writeLine(
		"npm ERR! 404  'this-package-definitely-does-not-exist@latest' is not in this registry."
	);

	// Label updates with error message - no new line added!
	await output.error("✗ Package not found!");
}

// Run examples
const flow = async () => {
	// Example 1: Simulated verbose npm output (safe to run)
	// await note(
	// 	"=== Example 1: Verbose npm output (only last 10 lines shown) ===\n"
	// );
	// await simulateVerboseNpmOutput();

	// await new Promise((r) => setTimeout(r, 500));

	// // Example 2: Simulated error
	// await note("\n\n=== Example 2: npm error handling ===\n");
	// await simulateNpmError();

	// Example 3: Real npm install (commented out for safety)
	// Uncomment to test with real package installation
	await note("\n\n=== Example 3: Real npm install ===\n");
	await installPackagesWithNpm(["chalk"]);

	// Example 4: Real pnpm install (commented out for safety)
	await note("\n\n=== Example 4: Real pnpm install ===\n");
	await installPackagesWithPnpm(["commander"]);
};

(async () => {
	try {
		const result = await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
