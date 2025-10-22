import { ask } from "../src/index.js";

async function onSubmitMixedExample() {
	console.log("=== onSubmit Mixed Return Values Example ===\n");
	console.log(
		"This example shows onSubmit callbacks with and without return values.\n"
	);

	const result = await ask(async ({ text, radio, multi, confirm }) => {
		// Text input with onSubmit callback that returns a value
		const name = await text({
			label: "What's your name?",
			onSubmit: (value: string) => {
				console.log(
					`Text callback: "${value}" -> transforming to uppercase`
				);
				return value.toUpperCase(); // Returns transformed value
			},
		});

		// Radio input with onSubmit callback that doesn't return a value
		const color = await radio({
			label: "What's your favorite color?",
			options: [
				{ value: "red", label: "Red" },
				{ value: "blue", label: "Blue" },
				{ value: "green", label: "Green" },
			],
			onSubmit: (value: string) => {
				console.log(
					`Radio callback: "${value}" -> no transformation (returns void)`
				);
				// No return statement - value remains unchanged
			},
		});

		// Multi-select with onSubmit callback that returns a value
		const hobbies = await multi({
			label: "What are your hobbies?",
			options: ["Reading", "Gaming", "Cooking", "Sports", "Music"],
			onSubmit: (values: string[]) => {
				console.log(
					`Multi callback: [${values.join(
						", "
					)}] -> adding count prefix`
				);
				// Return transformed values
				return values.map((hobby, index) => `${index + 1}. ${hobby}`);
			},
		});

		// Confirm with onSubmit callback that doesn't return a value
		const likesPizza = await confirm({
			label: "Do you like pizza?",
			onSubmit: (value: boolean) => {
				console.log(
					`Confirm callback: ${value} -> no transformation (returns void)`
				);
				// No return statement - value remains unchanged
			},
		});

		return { name, color, hobbies, likesPizza };
	});

	console.log("\n=== Final Result ===");
	console.log(JSON.stringify(result, null, 2));
	console.log("\n✅ onSubmit callbacks work with and without return values!");
}

onSubmitMixedExample().catch(console.error);
