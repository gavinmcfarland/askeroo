#!/usr/bin/env node
import { parseDepthMapFromFunction } from "../src/utils/depth-tracker.js";

// Test function that mimics the conditional structure from the plugma example
const testFunction = async () => {
	const addons = ["shadcn"]; // Simulate some selection

	// Conditionally prompt for shadcn config - should have depth 1
	let shadcnConfig;
	if (addons.includes("shadcn")) {
		shadcnConfig = "grape"; // await radio(...) would be here

		// Nested conditional - should have depth 2
		if (shadcnConfig === "grape") {
			console.log("text field would be here"); // await text(...) would be here
		}
	}

	// Another conditional branch - should have depth 1
	if (addons.includes("tailwind")) {
		console.log("tailwind text field would be here"); // await text(...) would be here
	}

	return { addons, shadcnConfig };
};

console.log("Testing depth parsing...");
const depthMap = parseDepthMapFromFunction(testFunction);

console.log("\nDepth map:");
for (const [key, depth] of depthMap.entries()) {
	console.log(`  ${key}: depth ${depth}`);
}

// Show the function source for reference
console.log("\nFunction source:");
console.log(testFunction.toString());