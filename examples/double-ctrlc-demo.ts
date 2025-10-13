/**
 * Demonstration of double Ctrl+C force quit behavior
 *
 * This example shows how the cancellation system works:
 * 1. First Ctrl+C: Triggers onCancel callbacks for graceful shutdown
 * 2. Second Ctrl+C: Forces immediate exit with process.exit(1)
 *
 * Try it: Run this example and press Ctrl+C once to see the cleanup message,
 * then press Ctrl+C again to force quit immediately.
 */

import { ask, text, spinner } from "../src/index.js";

async function demoDoubleCtrlC() {
	console.log("╔════════════════════════════════════════════════╗");
	console.log("║   Double Ctrl+C Force Quit Demo               ║");
	console.log("╚════════════════════════════════════════════════╝\n");
	console.log("Instructions:");
	console.log("  • Press Ctrl+C once to trigger graceful cancellation");
	console.log("  • Press Ctrl+C again to force quit immediately\n");

	try {
		const result = await ask(async ({ text, spinner, onCancel }) => {
			// Register cleanup callback
			onCancel(
				({
					results,
					cleanup,
				}: {
					results: Record<string, any>;
					cleanup: () => void;
				}) => {
					console.log(
						"\n╔════════════════════════════════════════════════╗"
					);
					console.log(
						"║   Cancellation Detected                        ║"
					);
					console.log(
						"╚════════════════════════════════════════════════╝"
					);
					console.log("\nRunning cleanup tasks...");

					// Simulate cleanup work
					console.log("  ✓ Closing database connections");
					console.log("  ✓ Saving partial progress");
					console.log("  ✓ Removing temporary files");

					console.log("\nPartial results collected:");
					console.log(results);

					console.log(
						"\nCleanup complete. Waiting for confirmation..."
					);
					console.log(
						"(The process will auto-exit in 60 seconds, or press Ctrl+C again to force quit now)\n"
					);

					// Note: We're NOT calling cleanup() or process.exit() here
					// to demonstrate that the user can press Ctrl+C again to force quit
				}
			);

			// Show a spinner while "initializing"
			const spin = await spinner({
				text: "Initializing application...",
			});

			// Simulate some async work
			await new Promise((resolve) => setTimeout(resolve, 1500));
			spin.stop();

			console.log("Application ready!\n");

			// Ask for user information
			const name = await text({
				label: "What's your name?",
				hint: "Your full name",
			});

			const email = await text({
				label: "What's your email?",
				hint: "user@example.com",
			});

			const company = await text({
				label: "What company do you work for?",
				hint: "Optional",
			});

			return { name, email, company };
		});

		console.log("\n╔════════════════════════════════════════════════╗");
		console.log("║   Flow Completed Successfully                  ║");
		console.log("╚════════════════════════════════════════════════╝\n");
		console.log("Results:");
		console.log(result);
	} catch (error) {
		console.error("\n╔════════════════════════════════════════════════╗");
		console.error("║   Flow Failed                                  ║");
		console.error("╚════════════════════════════════════════════════╝");
		console.error(
			`\nError: ${error instanceof Error ? error.message : String(error)}`
		);
		process.exit(1);
	}
}

demoDoubleCtrlC();
