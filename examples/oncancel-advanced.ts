import { ask } from "../src/index.js";
import { text } from "../src/built-ins/text/index.js";
import { confirm } from "../src/built-ins/confirm/index.js";
import fs from "fs";
import path from "path";

async function demonstrateAdvancedOnCancel() {
	console.log("Advanced onCancel example with resource cleanup...");
	console.log("Press Ctrl+C to trigger cleanup callbacks\n");

	const tempFile = path.join(process.cwd(), "temp-session.json");

	const result = await ask(async () => {
		// Create a temporary file
		const sessionData: {
			startTime: string;
			answers: { projectName?: string; description?: string };
		} = {
			startTime: new Date().toISOString(),
			answers: {},
		};
		fs.writeFileSync(tempFile, JSON.stringify(sessionData, null, 2));
		console.log(`📝 Created temporary file: ${tempFile}\n`);

		// Regular flow
		const projectName = await text({ label: "Project name?" });
		sessionData.answers.projectName = projectName;
		fs.writeFileSync(tempFile, JSON.stringify(sessionData, null, 2));

		const description = await text({ label: "Project description?" });
		sessionData.answers.description = description;
		fs.writeFileSync(tempFile, JSON.stringify(sessionData, null, 2));

		const confirmed = await confirm({ label: "Create this project?" });

		// Clean up temp file on successful completion
		if (fs.existsSync(tempFile)) {
			fs.unlinkSync(tempFile);
			console.log("✓ Temporary file cleaned up");
		}

		return { projectName, description, confirmed };
	}, {
		onCancel: ({ results, cleanup }) => {
			cleanup(); // Clean up UI first

			console.log("\n🚫 Advanced cancellation demo");
			console.log("📋 Collected answers:", results);

			console.log("\n🧹 Cleanup callback 1: Removing temporary file...");
			if (fs.existsSync(tempFile)) {
				fs.unlinkSync(tempFile);
				console.log("   ✓ Temporary file removed");
			}

			console.log("🔌 Cleanup callback 2: Closing connections...");
			console.log("   ✓ Connections closed");

			console.log("💾 Cleanup callback 3: Saving partial data...");
			console.log("   ✓ Partial data saved");

			process.exit(0); // User controls exit
		}
	});

	console.log("\n✅ Flow completed successfully!");
	console.log("Result:", result);
}

demonstrateAdvancedOnCancel();
