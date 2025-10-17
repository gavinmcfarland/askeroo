import { ask, stream, spawnWithColors } from "../src/index.js";

/**
 * Example showing automatic ANSI color preservation
 *
 * This demonstrates how spawnWithColors() automatically preserves
 * colors from commands like git, ls, npm, etc.
 *
 * The colors you see in your terminal (like git's red for modified files)
 * are preserved automatically without needing to know command-specific flags.
 */

async function gitStatusWithColors() {
	const output = await stream("Git Status (with colors)", {
		maxLines: 30,
	});

	return new Promise<void>((resolve, reject) => {
		// Use spawnWithColors instead of spawn - colors work automatically!
		const git = spawnWithColors("git", ["status"]);

		git.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		git.stderr.on("data", (data) => {
			output.write(data.toString());
		});

		git.on("error", (err) => {
			output.error(`Failed to run git: ${err.message}`);
			reject(err);
		});

		git.on("close", (code) => {
			if (code === 0) {
				output.complete("✓ Git status complete");
				resolve();
			} else {
				output.error(`✗ Git failed with code ${code}`);
				reject(new Error(`Git status failed`));
			}
		});
	});
}

async function gitDiffWithColors() {
	const output = await stream("Git Diff (with colors)", {
		maxLines: 30,
	});

	return new Promise<void>((resolve, reject) => {
		const git = spawnWithColors("git", ["diff", "--color=always"]);

		git.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		git.on("error", (err) => {
			output.error(`Failed to run git: ${err.message}`);
			reject(err);
		});

		git.on("close", (code) => {
			if (code === 0) {
				output.complete("✓ Git diff complete");
				resolve();
			} else {
				output.error(`✗ Git diff failed`);
				reject(new Error(`Git diff failed`));
			}
		});
	});
}

async function lsWithColors() {
	const output = await stream("Directory Listing (with colors)", {
		maxLines: 20,
	});

	return new Promise<void>((resolve) => {
		// On macOS, -G enables colors; on Linux, use --color=always
		const isMac = process.platform === "darwin";
		const args = isMac ? ["-lahG"] : ["-lah", "--color=always"];

		const ls = spawnWithColors("ls", args);

		ls.stdout.on("data", (data) => {
			output.write(data.toString());
		});

		ls.on("close", () => {
			output.complete("✓ Listing complete");
			resolve();
		});
	});
}

const flow = async () => {
	// Example 1: Git status with colors
	await gitStatusWithColors();

	// Example 2: Git diff with colors (if there are changes)
	// await gitDiffWithColors();

	// Example 3: ls with colors
	// await lsWithColors();

	return "Color preservation demo complete!";
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
