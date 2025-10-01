#!/usr/bin/env node

// Test script to verify static flow works with any fields
import { ask, group, text, confirm } from "./dist/src/index.js";

const testGenericStatic = async () => {
	const result = await ask(async ({ group, text, confirm }) => {
		// Test with completely different field names than the hardcoded ones
		const userPrefs = await group(
			async () => {
				const subscription = await text({ message: "Subscription type (basic/premium)" });
				const username = await text({ message: "Username" });

				// Conditional fields based on subscription type
				if (subscription === "premium") {
					const features = await text({ message: "Premium features" });
					const billing = await text({ message: "Billing address" });
					return { subscription, username, features, billing };
				}

				const newsletter = await confirm({ message: "Subscribe to newsletter?" });
				return { subscription, username, newsletter };
			},
			{ message: "User Preferences", flow: "static" }
		);

		return { userPrefs };
	});

	console.log("\nGeneric static flow result:", JSON.stringify(result, null, 2));
};

// Only run if called directly (not during build)
if (process.argv[1] === new URL(import.meta.url).pathname) {
	testGenericStatic().catch(console.error);
}