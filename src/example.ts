#!/usr/bin/env node

// Import runtime first to set up the global context
import { ask, group, text, confirm } from "./index.js";

// Then import plugins after runtime is established
import { multi } from "./custom-prompt-multi.js";
import { customText } from "./custom-text-plugin.js";
import { validatedText } from "./validated-text-plugin.js";

const flow = async () => {
	const name = await text({ message: "Single" });

	// Example of custom text input plugin with different styling
	const customName = await customText({
		message: "Enter your custom name",
		placeholder: "e.g. John Doe",
		prefix: "✨",
	});

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

	// Another group without message but with phase flow
	// No ID needed - automatically generates stable: group_0_3_phase
	const phasedForm = await group(
		{ message: "Phased", flow: "phase" },
		async () => {
			const customName = await customText({
				message: "Enter your custom name",
				placeholder: "e.g. John Doe",
				prefix: "✨",
			});
			const colors = await multi({
				message: "Select your favorite colors",
				options: ["red", "green", "blue", "yellow", "purple"],
			});
			const name = await text({ message: "Name" });
			const email = await text({ message: "Email" });
			const phone = await text({ message: "Phone" });
			const address = await text({ message: "Address" });
			return { name, email, phone, address };
		}
	);

	const stackedForm = await group({ message: "Stacked" }, async () => {
		const customName = await customText({
			message: "Enter your custom name",
			placeholder: "e.g. John Doe",
			prefix: "✨",
		});
		const colors = await multi({
			message: "Select your favorite colors",
			options: ["red", "green", "blue", "yellow", "purple"],
		});
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
			const customName = await customText({
				message: "Enter your custom name",
				placeholder: "e.g. John Doe",
				prefix: "✨",
			});
			const colors = await multi({
				message: "Select your favorite colors",
				options: ["red", "green", "blue", "yellow", "purple"],
			});
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
		customName,
		// email,
		// colors,
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
