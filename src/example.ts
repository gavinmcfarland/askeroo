#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";

const flow = async () => {
	const name = await text({ message: "Single" });

	// Another group without message but with phase flow
	// No ID needed - automatically generates stable: group_0_3_phase
	const phasedForm = await group(
		{ message: "Phased", flow: "phase" },
		async () => {
			const name = await text({ message: "Name" });
			const email = await text({ message: "Email" });
			const phone = await text({ message: "Phone" });
			const address = await text({ message: "Address" });
			return { name, email, phone, address };
		}
	);

	const stackedForm = await group({ message: "Stacked" }, async () => {
		const name = await text({ message: "Name" });
		const email = await text({ message: "Email" });
		const phone = await text({ message: "Phone" });
		const address = await text({ message: "Address" });
		return { name, email, phone, address };
	});

	// Static group - shows all prompts at once, only one active
	const staticForm = await group(
		{ message: "Static", flow: "static" },
		async () => {
			const name = await text({ message: "Name" });
			const email = await text({ message: "Email" });
			const phone = await text({ message: "Phone" });
			const address = await text({ message: "Address" });
			return { name, email };
		}
	);

	// Group with no message - should not show group header in UI
	// No ID needed - automatically generates stable: group_0_4_sequential
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

	return {
		name,
		stackedForm,
		phasedForm,
		staticForm,
		hiddenGroup,
		prefs,
	};
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
