#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";

const flow = async () => {
	let test = await text({ message: "Test" });

	let test2 = await text({ message: "Test2" });

	// Group 1: Profile (sequential by default)
	const profile = await group(
		{ message: "Profile", flow: "phase" },
		async () => {
			const first = await text({ message: "First name" });
			const middle = await text({ message: "Middle name" });
			const last = await text({ message: "Last name" });
			return { first, middle, last };
		}
	);

	// Group 2: Preferences (explicit phase behavior)
	const prefs = await group(
		{ message: "Preferences", flow: "phase" },
		async () => {
			const role = await text({ message: "Role (user/admin)" });
			if (role === "admin") {
				const code = await text({ message: "Access code" });
				const email = await text({ message: "Email" });
				return { role, code, email };
			}
			const news = await confirm({ message: "Subscribe to newsletter?" });
			return { role, news };
		}
	);

	const prefs2 = await group({ message: "What" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});

	const prefs3 = await group({ message: "Yoopooo" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});

	return { profile, prefs };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
