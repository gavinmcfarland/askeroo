import { ask, note, stream } from "../src/index.js";
import { spawn } from "child_process";

/**
 * Real-time streaming demo with commands that don't buffer
 *
 * This demonstrates the stream prompt with commands that actually
 * stream output in real-time, showing how it should work properly.
 *
 * Features shown:
 * - Live streaming output (not buffered like npm)
 * - maxLines limiting (only last N lines visible)
 * - Label updates on complete/error
 * - Line numbers
 * - Multiple concurrent streams
 */

/**
 * Example 1: Simple log generation that streams in real-time
 */
async function streamingLogGeneration() {
	const output = await stream("Generating logs...", {
		maxLines: 10, // Only show last 10 lines
		showLineNumbers: true,
	});

	return new Promise<void>((resolve, reject) => {
		// bash loop that outputs line by line - streams perfectly!
		const process = spawn("bash", [
			"-c",
			'for i in {1..25}; do echo "[$(date +%T)] Processing item $i"; sleep 0.15; done',
		]);

		process.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		process.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		process.on("error", (err) => {
			output.error(`Process failed: ${err.message}`);
			reject(err);
		});

		process.on("close", (code) => {
			if (code === 0) {
				output.complete("All 25 items processed!");
				resolve();
			} else {
				output.error(`Process failed with exit code ${code}`);
				reject(new Error(`Process exited with code ${code}`));
			}
		});
	});
}

/**
 * Example 2: Simulated build process with real-time output
 */
async function streamingBuildProcess() {
	const output = await stream("Building project...", {
		maxLines: 8,
		showLineNumbers: false,
		prefixSymbol: "│",
	});

	return new Promise<void>((resolve, reject) => {
		const script = `
			echo "Cleaning build directory..."
			sleep 0.3
			echo "Compiling TypeScript files..."
			sleep 0.2
			for i in {1..5}; do
				echo "  ✓ Compiled src/file-$i.ts"
				sleep 0.15
			done
			echo "Bundling assets..."
			sleep 0.3
			echo "Minifying JavaScript..."
			sleep 0.2
			echo "Optimizing images..."
			sleep 0.3
			echo "Build complete!"
		`;

		const process = spawn("bash", ["-c", script]);

		process.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		process.on("error", (err) => {
			output.error(`Build failed: ${err.message}`);
			reject(err);
		});

		process.on("close", (code) => {
			if (code === 0) {
				output.complete("Build completed successfully!");
				resolve();
			} else {
				output.error(`Build failed with exit code ${code}`);
				reject(new Error(`Build failed with code ${code}`));
			}
		});
	});
}

/**
 * Example 3: Long running process with many lines (demonstrating maxLines)
 */
async function streamingManyLines() {
	const output = await stream("Processing large dataset...", {
		maxLines: 5, // Only show last 5 lines - perfect for long output
		showLineNumbers: true,
	});

	return new Promise<void>((resolve, reject) => {
		// Generate 50 lines but only last 5 will be visible
		const script = `
			for i in {1..50}; do
				echo "Processing record $i/50"
				sleep 0.08
			done
		`;

		const process = spawn("bash", ["-c", script]);

		process.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		process.on("error", (err) => {
			output.error(`Processing failed: ${err.message}`);
			reject(err);
		});

		process.on("close", (code) => {
			if (code === 0) {
				output.complete("Processed 50 records successfully!");
				resolve();
			} else {
				output.error(`Processing failed with exit code ${code}`);
				reject(new Error(`Processing failed with code ${code}`));
			}
		});
	});
}

/**
 * Example 4: Simulated error scenario
 */
async function streamingWithError() {
	const output = await stream("Running tests...", {
		maxLines: 12,
		showLineNumbers: false,
	});

	return new Promise<void>((resolve, reject) => {
		const script = `
			echo "Starting test suite..."
			sleep 0.2
			echo "✓ test/auth.test.ts (5 passed)"
			sleep 0.2
			echo "✓ test/api.test.ts (8 passed)"
			sleep 0.2
			echo "✗ test/database.test.ts (2 passed, 1 failed)"
			sleep 0.2
			echo ""
			echo "  FAIL test/database.test.ts"
			echo "    ● Database › should connect"
			echo "      Connection timeout after 5000ms"
			echo ""
			exit 1
		`;

		const process = spawn("bash", ["-c", script]);

		process.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		process.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		process.on("error", (err) => {
			output.error(`Test runner failed: ${err.message}`);
			reject(err);
		});

		process.on("close", (code) => {
			if (code === 0) {
				output.complete("All tests passed!");
				resolve();
			} else {
				output.error("Test suite failed!");
				reject(new Error(`Tests failed with code ${code}`));
			}
		});
	});
}

/**
 * Example 5: Download simulation with progress
 */
async function streamingDownload() {
	const output = await stream("Downloading files...", {
		maxLines: 6,
		showLineNumbers: false,
		prefixSymbol: "→",
	});

	return new Promise<void>((resolve, reject) => {
		const files = [
			"package.tar.gz",
			"assets.zip",
			"database.sql",
			"config.json",
		];
		let current = 0;

		const downloadNext = async () => {
			if (current >= files.length) {
				output.complete(
					`Downloaded ${files.length} files successfully!`
				);
				resolve();
				return;
			}

			const file = files[current];
			await output.setLabel(
				`Downloading ${file}... (${current + 1}/${files.length})`
			);
			await output.writeLine(`Starting ${file}...`);

			// Simulate progress
			for (let pct = 0; pct <= 100; pct += 20) {
				await new Promise((r) => setTimeout(r, 150));
				await output.writeLine(`  ${pct}% - ${file}`);
			}

			await output.writeLine(`✓ ${file} complete`);
			current++;
			downloadNext();
		};

		downloadNext().catch(reject);
	});
}

/**
 * Example 6: Tail-like behavior - monitoring a "log file"
 */
async function streamingTailSimulation() {
	const output = await stream("Monitoring server logs...", {
		maxLines: 8,
		showLineNumbers: true,
	});

	return new Promise<void>((resolve, reject) => {
		const script = `
			for i in {1..30}; do
				level=$((RANDOM % 3))
				case $level in
					0) echo "[$(date +%T)] INFO: Request $i processed successfully" ;;
					1) echo "[$(date +%T)] WARN: Slow query detected (\${i}ms)" ;;
					2) echo "[$(date +%T)] DEBUG: Cache hit for user_$i" ;;
				esac
				sleep 0.12
			done
		`;

		const process = spawn("bash", ["-c", script]);

		process.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		process.on("error", (err) => {
			output.error(`Monitoring failed: ${err.message}`);
			reject(err);
		});

		process.on("close", (code) => {
			if (code === 0) {
				output.complete("Monitoring session ended");
				resolve();
			} else {
				output.error(`Monitoring failed with exit code ${code}`);
				reject(new Error(`Monitoring failed with code ${code}`));
			}
		});
	});
}

// Run all examples
const flow = async () => {
	await note(
		"=== Example 1: Log Generation (25 lines → showing last 10) ===\n"
	);
	await streamingLogGeneration();

	await new Promise((r) => setTimeout(r, 800));

	await note("\n\n=== Example 2: Build Process ===\n");
	await streamingBuildProcess();

	await new Promise((r) => setTimeout(r, 800));

	await note(
		"\n\n=== Example 3: Many Lines (50 lines → showing last 5) ===\n"
	);
	await streamingManyLines();

	await new Promise((r) => setTimeout(r, 800));

	await note("\n\n=== Example 4: Error Handling ===\n");
	try {
		await streamingWithError();
	} catch (err) {
		// Expected to fail - that's the demo
	}

	await new Promise((r) => setTimeout(r, 800));

	await note("\n\n=== Example 5: Download Progress ===\n");
	await streamingDownload();

	await new Promise((r) => setTimeout(r, 800));

	await note(
		"\n\n=== Example 6: Log Monitoring (30 lines → showing last 8) ===\n"
	);
	await streamingTailSimulation();

	return "All streaming examples completed!";
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
