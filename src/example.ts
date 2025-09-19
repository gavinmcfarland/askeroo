#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";

const flow = async () => {
	// Group 1: Profile
	const profile = await group({ message: "Profile" }, async () => {
		const first = await text({ message: "First name" });
		const last = await text({ message: "Last name" });
		return [first, last];
	});

	// Group 2: Preferences (with conditional)
	const prefs = await group({ message: "Preferences" }, async () => {
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
