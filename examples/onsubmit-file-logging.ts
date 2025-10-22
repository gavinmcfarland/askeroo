import { ask } from "../src/index.js";
import { writeFileSync, appendFileSync } from "fs";

async function onSubmitWithFileLogging() {
	console.log("=== onSubmit Callback with File Logging Example ===\n");
	console.log(
		"This example demonstrates onSubmit callbacks by writing to a log file.\n"
	);

	const logFile = "user-interactions.log";

	// Clear the log file
	writeFileSync(logFile, "User Interaction Log\n===================\n\n");

	const result = await ask(async ({ text, radio, multi, confirm }) => {
		// Text input with onSubmit callback that logs to file
		const name = await text({
			label: "What's your name?",
			onSubmit: (value: string) => {
				appendFileSync(
					logFile,
					`[${new Date().toISOString()}] Text submitted: "${value}"\n`
				);
			},
		});

		// Radio input with onSubmit callback that logs to file
		const color = await radio({
			label: "What's your favorite color?",
			options: [
				{ value: "red", label: "Red" },
				{ value: "blue", label: "Blue" },
				{ value: "green", label: "Green" },
			],
			onSubmit: (value: string) => {
				appendFileSync(
					logFile,
					`[${new Date().toISOString()}] Radio submitted: "${value}"\n`
				);
			},
		});

		// Multi-select with onSubmit callback that logs to file
		const hobbies = await multi({
			label: "What are your hobbies?",
			options: ["Reading", "Gaming", "Cooking", "Sports", "Music"],
			onSubmit: (values: string[]) => {
				appendFileSync(
					logFile,
					`[${new Date().toISOString()}] Multi submitted: [${values.join(
						", "
					)}]\n`
				);
			},
		});

		// Confirm with onSubmit callback that logs to file
		const likesPizza = await confirm({
			label: "Do you like pizza?",
			onSubmit: (value: boolean) => {
				appendFileSync(
					logFile,
					`[${new Date().toISOString()}] Confirm submitted: ${value}\n`
				);
			},
		});

		return { name, color, hobbies, likesPizza };
	});

	console.log("\n=== Final Result ===");
	console.log(JSON.stringify(result, null, 2));
	console.log(
		`\n✅ All onSubmit callbacks were executed! Check ${logFile} to see the logged interactions.`
	);
}

onSubmitWithFileLogging().catch(console.error);
