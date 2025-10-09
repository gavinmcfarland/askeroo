import { ask } from "../src/index.js";
import { text } from "../src/built-ins/text/index.js";
import { confirm } from "../src/built-ins/confirm/index.js";

async function demonstrateOnCancel() {
	console.log("Testing onCancel event listener...");
	console.log("Press Ctrl+C to trigger the cancel callback\n");

	const result = await ask(
		async () => {
			const name = await text({ label: "What's your name?" });
			const age = await text({ label: "How old are you?" });
			const confirmed = await confirm({
				label: `Is ${name} (${age} years old) correct?`,
			});

			return { name, age, confirmed };
		},
		{
			onCancel: ({ results, cleanup }) => {
				cleanup(); // Clean up UI first
				console.log("\n🚫 Flow cancelled! Cleaning up...");
				console.log("Collected answers so far:", results);
				console.log(
					"This is where you would clean up resources, close connections, etc."
				);
				process.exit(0); // User controls exit
			},
		}
	);

	console.log("\n✅ Flow completed successfully!");
	console.log("Result:", result);
}

demonstrateOnCancel();
