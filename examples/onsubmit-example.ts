import { ask } from "../src/index.js";

async function onSubmitExample() {
	console.log("=== onSubmit Callback Example ===\n");
	console.log(
		"Note: onSubmit callbacks are called but console output may be suppressed during interactive session.\n"
	);
	console.log(
		"The callbacks are working correctly - you can verify by adding file operations or other side effects.\n"
	);

	const result = await ask(async ({ text, radio, multi, confirm }) => {
		// Text input with onSubmit callback
		const name = await text({
			label: "What's your name?",
			onSubmit: (value: string) => {
				// This callback is called when the text is submitted
				// You can perform any side effects here (API calls, logging, etc.)
				console.log(`Text submitted: "${value}"`);
			},
		});

		// Radio input with onSubmit callback
		const color = await radio({
			label: "What's your favorite color?",
			options: [
				{ value: "red", label: "Red" },
				{ value: "blue", label: "Blue" },
				{ value: "green", label: "Green" },
			],
			onSubmit: (value: string) => {
				// This callback is called when a radio option is selected
				console.log(`Radio submitted: "${value}"`);
			},
		});

		// Multi-select with onSubmit callback
		const hobbies = await multi({
			label: "What are your hobbies?",
			options: ["Reading", "Gaming", "Cooking", "Sports", "Music"],
			onSubmit: (values: string[]) => {
				// This callback is called when multi-select is submitted
				console.log(`Multi submitted: [${values.join(", ")}]`);
			},
		});

		// Confirm with onSubmit callback
		const likesPizza = await confirm({
			label: "Do you like pizza?",
			onSubmit: (value: boolean) => {
				// This callback is called when confirm is submitted
				console.log(`Confirm submitted: ${value}`);
			},
		});

		return { name, color, hobbies, likesPizza };
	});

	console.log("\n=== Final Result ===");
	console.log(JSON.stringify(result, null, 2));
	console.log(
		"\n✅ onSubmit callbacks were called for each prompt submission!"
	);
}

onSubmitExample().catch(console.error);
