import { ask, stream, note, spawnWithColors } from "../src/index.js";

/**
 * Example of streaming real command output
 * This example shows how to capture output from actual shell commands
 * with automatic ANSI color preservation
 */

async function runCommand(command: string, args: string[], label?: string) {
	const output = await stream(
		label || `Running: ${command} ${args.join(" ")}`,
		{
			maxLines: 25,
		}
	);

	return new Promise<number>((resolve, reject) => {
		// Use spawnWithColors to preserve ANSI colors from commands
		const proc = spawnWithColors(command, args);

		proc.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		proc.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		proc.on("error", (err) => {
			output.error(`Failed to start command: ${err.message}`);
			reject(err);
		});

		proc.on("close", (code) => {
			if (code === 0) {
				output.complete(
					`✓ Command completed successfully (exit code: ${code})`
				);
				resolve(code || 0);
			} else {
				output.error(`✗ Command failed with exit code: ${code}`);
				resolve(code || 1);
			}
		});
	});
}

async function npmInstall(packages: string[]) {
	return runCommand(
		"npm",
		["install", ...packages],
		`Installing ${packages.join(", ")}...`
	);
}

async function gitStatus() {
	return runCommand("git", ["status"], "Git Status");
}

async function listFiles() {
	return runCommand("ls", ["-lah"], "Directory Listing");
}

async function runTests() {
	return runCommand("npm", ["test"], "Running Tests");
}

// Example usage
const flow = async () => {
	// Example 1: List files in current directory
	await note("\n=== Listing Files ===\n");
	await listFiles();

	// Example 2: Git status
	await note("\n\n=== Git Status ===\n");
	await gitStatus();

	// Example 3: Install packages (commented out to avoid actually installing)
	// console.log("\n\n=== Installing Packages ===\n");
	// await npmInstall(['chalk', 'commander']);

	// Example 4: Run tests (if you have tests configured)
	// console.log("\n\n=== Running Tests ===\n");
	// try {
	//   await runTests();
	// } catch (err) {
	//   console.error("Tests failed");
	// }

	return "All commands completed!";
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
