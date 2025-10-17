import { ask, note, stream } from "../src/index.js";

async function simulateNpmInstall() {
	const output = await stream({
		maxLines: 15,
		showLineNumbers: false,
	});

	// Simulate npm install output
	const packages = [
		"lodash@4.17.21",
		"axios@1.5.0",
		"chalk@5.3.0",
		"commander@11.0.0",
		"inquirer@9.2.11",
	];

	await output.writeLine("npm WARN deprecated inflight@1.0.6");
	await new Promise((r) => setTimeout(r, 200));

	for (const pkg of packages) {
		await output.writeLine(`added ${pkg}`);
		await new Promise((r) => setTimeout(r, 300));
	}

	await output.writeLine("");
	await output.writeLine(`added ${packages.length} packages in 2.5s`);
	await output.writeLine("");
	await output.writeLine("15 packages are looking for funding");
	await output.writeLine("  run `npm fund` for details");

	await output.complete("Installation complete!");
}

async function simulateBuildProcess() {
	const output = await stream("Building project...", {
		maxLines: 20,
		prefixSymbol: "│",
	});

	await output.writeLine("Cleaning output directory...");
	await new Promise((r) => setTimeout(r, 300));

	await output.writeLine("Compiling TypeScript...");
	await new Promise((r) => setTimeout(r, 200));
	await output.writeLine("  ✓ src/index.ts");
	await new Promise((r) => setTimeout(r, 100));
	await output.writeLine("  ✓ src/utils.ts");
	await new Promise((r) => setTimeout(r, 100));
	await output.writeLine("  ✓ src/types.ts");
	await new Promise((r) => setTimeout(r, 100));
	await output.writeLine("  ✓ src/components/App.tsx");
	await new Promise((r) => setTimeout(r, 200));

	await output.writeLine("Bundling assets...");
	await new Promise((r) => setTimeout(r, 300));
	await output.writeLine("  ✓ styles.css (12.5 KB)");
	await new Promise((r) => setTimeout(r, 200));
	await output.writeLine("  ✓ images optimized (3 files)");
	await new Promise((r) => setTimeout(r, 300));

	await output.writeLine("Running tests...");
	await new Promise((r) => setTimeout(r, 500));
	await output.writeLine("  ✓ 15 tests passed");

	await output.complete("✓ Build completed successfully!");
}

async function streamWithLineNumbers() {
	const output = await stream("Server logs", {
		maxLines: 10,
		showLineNumbers: true,
		prefixSymbol: "▸",
	});

	// Simulate many log entries - only last 10 will be visible
	for (let i = 1; i <= 25; i++) {
		await output.writeLine(
			`[${new Date().toISOString()}] Request ${i} processed`
		);
		await new Promise((r) => setTimeout(r, 150));
	}

	await output.complete("Server stopped");
}

async function streamWithProgressUpdates() {
	const output = await stream("Processing files...");

	const files = ["config.json", "data.csv", "image.png", "document.pdf"];

	for (let i = 0; i < files.length; i++) {
		await output.setLabel(`Processing files... (${i + 1}/${files.length})`);
		await output.writeLine(`Starting ${files[i]}...`);
		await new Promise((r) => setTimeout(r, 500));
		await output.writeLine(`✓ ${files[i]} complete`);
		await new Promise((r) => setTimeout(r, 200));
	}

	await output.complete("All files processed!");
}

async function streamWithError() {
	const output = await stream("Running tests...");

	await output.writeLine("Starting test suite...");
	await new Promise((r) => setTimeout(r, 300));
	await output.writeLine("✓ test/auth.test.ts (5 passed)");
	await new Promise((r) => setTimeout(r, 300));
	await output.writeLine("✓ test/api.test.ts (8 passed)");
	await new Promise((r) => setTimeout(r, 300));
	await output.writeLine("✗ test/database.test.ts (2 passed, 1 failed)");
	await new Promise((r) => setTimeout(r, 200));
	await output.writeLine("");
	await output.writeLine("  FAIL test/database.test.ts");
	await output.writeLine("    ● Database › should connect");
	await output.writeLine("      Connection timeout after 5000ms");

	await output.error("Test suite failed!");
}

// Run examples
const flow = async () => {
	await note("\n=== NPM Install Simulation ===\n");
	await simulateNpmInstall();

	await note("\n\n=== Build Process ===\n");
	await simulateBuildProcess();

	await note(
		"\n\n=== Streaming Logs with Line Numbers (only last 10 shown) ===\n"
	);
	await streamWithLineNumbers();

	await note("\n\n=== Progress Updates ===\n");
	await streamWithProgressUpdates();

	await note("\n\n=== Error Example ===\n");
	await streamWithError();

	return "All examples completed!";
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
