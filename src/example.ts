#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";

const flow = async () => {
	let test = await text({ message: "Test" });

	let test2 = await text({ message: "Test2" });

	const profile = await group(
		{ message: "Profile", flow: "phase" },
		async () => {
			const first = await text({ message: "First name" });

			const middle = await text({ message: "Middle name" });

			const last = await text({ message: "Last name" });

			return { first, middle, last };
		}
	);

	// Another group without message but with phase flow
	// No ID needed - automatically generates stable: group_0_2_phase
	const hiddenPhase = await group(
		{ flow: "phase" },
		async () => {
			const step1 = await text({ message: "Step 1" });
			const step2 = await text({ message: "Step 2" });
			return { step1, step2 };
		}
	);

	// Group with no message - should not show group header in UI
	// No ID needed - automatically generates stable: group_0_3_sequential
	const hiddenGroup = await group({}, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});

	const prefs = await group({ message: "Preferences" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			const email = await text({ message: "Email" });
			return { role, code, email };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});

	return { profile, hiddenGroup, prefs, hiddenPhase };
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
