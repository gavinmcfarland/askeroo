import { ask } from "../src/index.js";

async function onSubmitReturnValueExample() {
	console.log("=== onSubmit Return Value Example ===\n");
	console.log(
		"This example demonstrates how onSubmit callbacks can transform submitted values.\n"
	);

	const result = await ask(async ({ text, radio, multi, confirm }) => {
		// Text input with onSubmit callback that transforms the value
		const name = await text({
			label: "What's your name?",
			onSubmit: (value: string) => {
				console.log(`Original text: "${value}"`);
				// Transform to uppercase
				return value.toUpperCase();
			},
		});

		// Radio input with onSubmit callback that transforms the value
		const color = await radio({
			label: "What's your favorite color?",
			options: [
				{ value: "red", label: "Red" },
				{ value: "blue", label: "Blue" },
				{ value: "green", label: "Green" },
			],
			onSubmit: (value: string) => {
				console.log(`Original radio: "${value}"`);
				// Transform to a different format
				return `color_${value}`;
			},
		});

		// Multi-select with onSubmit callback that transforms the values
		const hobbies = await multi({
			label: "What are your hobbies?",
			options: ["Reading", "Gaming", "Cooking", "Sports", "Music"],
			onSubmit: (values: string[]) => {
				console.log(`Original multi: [${values.join(", ")}]`);
				// Transform to uppercase and add prefix
				return values.map((hobby) => `HOBBY_${hobby.toUpperCase()}`);
			},
		});

		// Confirm with onSubmit callback that transforms the value
		const likesPizza = await confirm({
			label: "Do you like pizza?",
			onSubmit: (value: boolean) => {
				console.log(`Original confirm: ${value}`);
				// Transform boolean to string
				return value ? "YES" : "NO";
			},
		});

		return { name, color, hobbies, likesPizza };
	});

	console.log("\n=== Final Result (with transformed values) ===");
	console.log(JSON.stringify(result, null, 2));
	console.log(
		"\n✅ All onSubmit callbacks transformed the submitted values!"
	);
}

onSubmitReturnValueExample().catch(console.error);
