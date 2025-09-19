#!/usr/bin/env node

import { ask, group, text, confirm, conditional } from "./core-enhanced.js";
import { validateRequired, validateEmail } from "./utils.js";

const enhancedFlow = async () => {
	// Group 1: Profile with enhanced tracking
	const profile = await group({
		message: "Profile",
		id: "profile"
	}, async () => {
		const first = await text({
			message: "First name",
			name: "firstName",
			placeholder: "Enter your first name",
			validate: validateRequired,
		});

		const last = await text({
			message: "Last name",
			name: "lastName",
			placeholder: "Enter your last name",
			validate: validateRequired,
		});

		const email = await text({
			message: "Email address",
			name: "email",
			placeholder: "your@email.com",
			validate: (value: string) => {
				const required = validateRequired(value);
				if (required !== true) return required;
				return validateEmail(value);
			},
		});

		return { first, last, email };
	});

	// Group 2: Preferences with conditional logic
	const prefs = await group({
		message: "Preferences",
		id: "preferences"
	}, async () => {
		const role = await text({
			message: "Role (user/admin)",
			name: "userRole",
			placeholder: "user or admin",
			validate: (value: string) => {
				if (!["user", "admin"].includes(value.toLowerCase())) {
					return 'Role must be either "user" or "admin"';
				}
				return true;
			},
		});

		// Enhanced conditional with tracking
		if (await conditional("isAdmin", () => role.toLowerCase() === "admin")) {
			const code = await text({
				message: "Access code",
				name: "accessCode",
				placeholder: "Enter admin access code",
				validate: validateRequired,
			});

			const permissions = await text({
				message: "Permissions level",
				name: "permissions",
				placeholder: "read, write, admin",
				validate: validateRequired,
			});

			return { role, code, permissions };
		}

		// User branch - age-based premium check
		const age = await text({
			message: "Age",
			name: "userAge",
			placeholder: "Your age",
			validate: (value: string) => {
				const num = parseInt(value);
				if (isNaN(num) || num < 13) {
					return "Age must be a number and at least 13";
				}
				return true;
			},
		});

		const ageNumber = parseInt(age);

		// Another conditional for premium features
		if (await conditional("isPremiumEligible", () => ageNumber >= 18)) {
			const premium = await confirm({
				message: "Upgrade to premium?",
				name: "premium",
				initial: false,
			});

			if (premium) {
				const tier = await text({
					message: "Premium tier (basic/pro/enterprise)",
					name: "premiumTier",
					placeholder: "basic, pro, or enterprise",
					validate: (value: string) => {
						if (!["basic", "pro", "enterprise"].includes(value.toLowerCase())) {
							return 'Tier must be basic, pro, or enterprise';
						}
						return true;
					},
				});

				return { role, age, premium, tier };
			}

			return { role, age, premium };
		}

		// Standard user preferences
		const newsletter = await confirm({
			message: "Subscribe to newsletter?",
			name: "newsletter",
			initial: false,
		});

		const notifications = await confirm({
			message: "Enable email notifications?",
			name: "notifications",
			initial: true,
		});

		return { role, age, newsletter, notifications };
	});

	return { profile, prefs };
};

// Run the enhanced example
async function runEnhancedExample() {
	try {
		console.log("🚀 Welcome to Enhanced Askeroo CLI Demo!\n");
		console.log("✨ This version supports full back navigation!");
		console.log("💡 Press Esc at any prompt to go back and change previous answers.\n");

		const result = await ask(enhancedFlow, {
			enableBackNavigation: true,
			maxHistorySteps: 20,
			debugMode: true
		});

		console.log("\n🎉 Enhanced flow completed!");
		console.log("Results:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	runEnhancedExample();
}