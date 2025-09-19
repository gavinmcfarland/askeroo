#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";
import { validateRequired, validateEmail } from "./utils.js";

const flow = async () => {
	// Group 1: Profile
	const profile = await group({ message: "Profile" }, async () => {
		const first = await text({
			message: "First name",
			placeholder: "Enter your first name",
			validate: validateRequired,
		});

		const last = await text({
			message: "Last name",
			placeholder: "Enter your last name",
			validate: validateRequired,
		});

		const email = await text({
			message: "Email address",
			placeholder: "your@email.com",
			validate: (value: string) => {
				const required = validateRequired(value);
				if (required !== true) return required;
				return validateEmail(value);
			},
		});

		return { first, last, email };
	});

	// Group 2: Preferences (with conditional)
	const prefs = await group({ message: "Preferences" }, async () => {
		const role = await text({
			message: "Role (user/admin)",
			placeholder: "user or admin",
			validate: (value: string) => {
				if (!["user", "admin"].includes(value.toLowerCase())) {
					return 'Role must be either "user" or "admin"';
				}
				return true;
			},
		});

		if (role.toLowerCase() === "admin") {
			const code = await text({
				message: "Access code",
				placeholder: "Enter admin access code",
				validate: validateRequired,
			});
			return { role, code };
		}

		const newsletter = await confirm({
			message: "Subscribe to newsletter?",
			initial: false,
		});

		const notifications = await confirm({
			message: "Enable email notifications?",
			initial: true,
		});

		return { role, newsletter, notifications };
	});

	return { profile, prefs };
};

// Run the example
async function runExample() {
	try {
		console.log("Welcome to Askeroo CLI Demo!\n");

		const result = await ask(flow);

		console.log("\n🎉 Flow completed!");
		console.log("Results:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runExample();
}
