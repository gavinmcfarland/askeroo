#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";

const flow = async () => {
	// let test = await text({ message: "Test" });

	// let test2 = await text({ message: "Test s" });
	// Group 1: Profile
	const profile = await group({ message: "Profile" }, async () => {
		const first = await text({ message: "First name", name: "profile-first" });
		const last = await text({ message: "Last name", name: "profile-last" });
		return [first, last];
	});

	// Group 2: Preferences (with conditional)
	const prefs = await group({ message: "Preferences" }, async () => {
		const role = await text({ message: "Role (user/admin)", name: "prefs-role" });
		if (role === "admin") {
			const code = await text({ message: "Access code", name: "prefs-code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?", name: "prefs-news" });
		return { role, news };
	});

	const prefs2 = await group({ message: "What" }, async () => {
		const role = await text({ message: "Role (user/admin)", name: "what-role" });
		if (role === "admin") {
			const code = await text({ message: "Access code", name: "what-code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?", name: "what-news" });
		return { role, news };
	});

	const prefs3 = await group({ message: "Yoopooo" }, async () => {
		const role = await text({ message: "Role (user/admin)", name: "yoopooo-role" });
		if (role === "admin") {
			const code = await text({ message: "Access code", name: "yoopooo-code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?", name: "yoopooo-news" });
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
