import { ask } from "../src/index.js";

async function onSubmitSimpleTest() {
	console.log("=== onSubmit Callback Simple Test ===\n");
	console.log(
		"This example demonstrates onSubmit callbacks with simple side effects.\n"
	);

	let callbackCount = 0;
	const callbackResults: string[] = [];

	const result = await ask(async ({ text, radio, multi, confirm }) => {
		// Text input with onSubmit callback
		const name = await text({
			label: "What's your name?",
			onSubmit: (value: string) => {
				callbackCount++;
				callbackResults.push(`Text: ${value}`);
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
				callbackCount++;
				callbackResults.push(`Radio: ${value}`);
			},
		});

		// Multi-select with onSubmit callback
		const hobbies = await multi({
			label: "What are your hobbies?",
			options: ["Reading", "Gaming", "Cooking", "Sports", "Music"],
			onSubmit: (values: string[]) => {
				callbackCount++;
				callbackResults.push(`Multi: [${values.join(", ")}]`);
			},
		});

		// Confirm with onSubmit callback
		const likesPizza = await confirm({
			label: "Do you like pizza?",
			onSubmit: (value: boolean) => {
				callbackCount++;
				callbackResults.push(`Confirm: ${value}`);
			},
		});

		return { name, color, hobbies, likesPizza };
	});

	console.log("\n=== Final Result ===");
	console.log(JSON.stringify(result, null, 2));

	console.log(`\n=== onSubmit Callback Results ===`);
	console.log(`Total callbacks executed: ${callbackCount}`);
	console.log(`Callback results:`);
	callbackResults.forEach((result, index) => {
		console.log(`  ${index + 1}. ${result}`);
	});

	if (callbackCount === 4) {
		console.log("\n✅ All onSubmit callbacks were executed successfully!");
	} else {
		console.log(
			`\n❌ Expected 4 callbacks, but only ${callbackCount} were executed.`
		);
	}
}

onSubmitSimpleTest().catch(console.error);
