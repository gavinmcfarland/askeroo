import { ask, group, text, confirm, note } from "../src/index.js";

const flow = async () => {
	// Display notes
	await note("[Hello world!]{bgBlue}");

	// Call prompts on their own
	const nickname = await text({ label: "Nickname" });

	// Group prompts together
	const profile = await group(async () => {
		const first = await text({ label: "First name" });
		const last = await text({ label: "Last name" });
		return { first, last };
	});

	// Create conditional inputs
	const prefs = await group(
		async () => {
			const role = await text({ label: "Role (user/admin)" });
			if (role === "admin") {
				const code = await text({ label: "Access code" });
				return { role, code };
			}
			const news = await confirm({ label: "Subscribe to newsletter?" });
			return { role, news };
		},
		{ label: "Preferences" } // Optional group labels
	);

	// Return structured data your way
	return { nickname, profile, prefs };
};

const result = await ask(flow);
console.log(result);
