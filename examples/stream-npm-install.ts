import { ask, stream } from "../src/index.js";
import { spawn } from "child_process";

/**
 * Simple example of streaming npm install output
 * Shows real-time progress of package installation
 */

async function installWithStream(packages: string[]) {
	const output = await stream(`Installing ${packages.join(", ")}...`, {
		maxLines: 20, // Only show last 20 lines
	});

	return new Promise<void>((resolve, reject) => {
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

const flow = async () => {
	// Example: Install a package
	// Uncomment to actually install packages:
	await installWithStream(["chalk"]);

	console.log("To use this example, uncomment the line in the flow function");
	console.log("and specify the packages you want to install.");
	console.log("\nExample:");
	console.log("  await installWithStream(['chalk', 'commander']);");

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
