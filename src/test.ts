#!/usr/bin/env node

// Import runtime first to set up the global context
import { ask, group, text, confirm } from "./index.js";

// Then import plugins after runtime is established
import { multi } from "./plugins/multi/index.js";

const flow = async () => {
	const name = await text({
		message: "First",
		initialValue: "Hello",
	});
	const name2 = await text({ message: "Second", initialValue: "World" });

	const prefs2 = await group(
		async () => {
			const role = await text({
				message: "Role (user/admin)",
				shortMessage: "Role",
			});
			const name = await text({ message: "Name" });
			if (role === "admin") {
				const code = await text({ message: "Access code" });
				const email = await text({ message: "Email" });
				return { role, code, email };
			}
			const news = await confirm({ message: "Subscribe to newsletter?" });
			return { name, role, news };
		},
		{ message: "Static", flow: "static" }
	);

	// Example of validated text input plugin
	// const email = await validatedText({
	// 	message: "Enter your email address",
	// 	validate: (value: string) => {
	// 		if (!value.includes("@")) return "Email must contain @";
	// 		if (!value.includes(".")) return "Email must contain a domain";
	// 		return true;
	// 	},
	// 	transform: (value: string) => value.toLowerCase().trim(),
	// });

	// // Example of custom multi-select prompt plugin
	const colors = await multi({
		message: "Select your favorite colors",
		options: ["red", "green", "blue", "yellow", "purple"],
	});

	// Another group without message but with phased flow
	// No ID needed - automatically generates stable: group_0_3_phased
	const phasedForm = await group(
		async () => {
			const colors = await multi({
				message: "Select your favorite colors",
				options: ["red", "green", "blue", "yellow", "purple"],
			});
			const name = await text({ message: "Name" });
			const email = await text({ message: "Email" });
			const phone = await text({ message: "Phone" });
			const address = await text({ message: "Address" });
			return { name, email, phone, address };
		},
		{ message: "Phased", flow: "phased" }
	);

	const stackedForm = await group(async () => {
		const colors = await multi({
			message: "Select your favorite colors",
			options: ["red", "green", "blue", "yellow", "purple"],
		});
		const name = await text({ message: "Name" });
		const email = await text({ message: "Email" });
		const phone = await text({ message: "Phone" });
		const address = await text({ message: "Address" });
		return { name, email, phone, address };
	}, { message: "Stacked" });

	// Static group - shows all prompts at once, only one active
	const staticForm = await group(
		async () => {
			const colors = await multi({
				message: "Select your favorite colors",
				options: ["red", "green", "blue", "yellow", "purple"],
			});
			const name = await text({ message: "Name" });
			const email = await text({ message: "Email" });
			const phone = await text({ message: "Phone" });
			const address = await text({ message: "Address" });
			return { name, email };
		},
		{ message: "Static", flow: "static" }
	);

	// Static group with arrow navigation enabled - use arrow keys to navigate between fields
	const staticWithNavigation = await group(
		async () => {
			const firstName = await text({ message: "First name" });
			const lastName = await text({ message: "Last name" });
			const newsletter = await confirm({ message: "Subscribe to newsletter?" });
			const phone = await text({ message: "Phone number" });
			return { firstName, lastName, newsletter, phone };
		},
		{ message: "Static with Arrow Navigation", flow: "static", enableArrowNavigation: true }
	);

	// Static group without arrow navigation (default behavior)
	const staticWithoutNavigation = await group(
		async () => {
			const username = await text({ message: "Username" });
			const password = await text({ message: "Password" });
			const confirmPassword = await text({ message: "Confirm password" });
			return { username, password, confirmPassword };
		},
		{ message: "Static without Arrow Navigation", flow: "static" }
	);

	// Group with no message - should not show group header in UI
	// No ID needed - automatically generates stable: group_0_4_sequential
	const hiddenGroup = await group(async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	}, {});

	const prefs = await group(async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			const email = await text({ message: "Email" });
			return { role, code, email };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	}, { message: "Preferences" });

	return {
		name,
		// email,
		// colors,
		stackedForm,
		phasedForm,
		staticForm,
		staticWithNavigation,
		staticWithoutNavigation,
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
