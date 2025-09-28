#!/usr/bin/env node
import {
	ask,
	text,
	radio,
	multi,
} from "../src/index.js";

// Test flow that demonstrates conditional field depth tracking
const testDepthTracking = async () => {
	const addons = await multi({
		shortLabel: "Addons",
		label: "Choose addons:",
		options: [
			{
				value: "shadcn",
				label: "Shadcn",
				hint: "A library of components for building websites",
			},
			{
				value: "tailwind",
				label: "Tailwind",
				hint: "A utility-first CSS framework",
			},
		],
		noneOption: { label: "None" },
	});

	// Conditionally prompt for shadcn config - should have depth 1
	let shadcnConfig;
	if (addons.includes("shadcn")) {
		shadcnConfig = await radio({
			label: "Choose shadcn configuration:",
			shortLabel: "Shadcn Config",
			options: [
				{ value: "default", label: "Default" },
				{ value: "shadcn-grape", label: "Grape" },
				{ value: "shadcn-honey", label: "Honey" },
			],
		});

		// Nested conditional - should have depth 2
		if (shadcnConfig === "shadcn-grape") {
			await text({
				shortLabel: "Grape Theme",
				label: "Enter custom grape theme name:",
				initialValue: "grape-custom",
			});
		}
	}

	// Another conditional branch - should have depth 1
	if (addons.includes("tailwind")) {
		await text({
			shortLabel: "Tailwind Config",
			label: "Enter Tailwind config path:",
			initialValue: "./tailwind.config.js",
		});

		// Test logical operator conditional - should have depth 2
		if (addons.includes("tailwind") && addons.includes("shadcn")) {
			await text({
				shortLabel: "Integration",
				label: "Enter integration settings:",
				initialValue: "auto",
			});
		}
	}

	return { addons, shadcnConfig };
};

(async () => {
	try {
		console.log("Starting depth tracking test...");
		const result = await ask(testDepthTracking);
		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();