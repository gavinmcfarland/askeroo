import { ask, group, text, confirm, note } from "../src/index.js";

const flow = async () => {
	// Display notes
	await note("[Hello world!]{bgBlue}");

	// Call prompts on their own
	const nickname = await text({ label: "Nickname" });

	// Group prompts together
	const profile = await group(
		async () => {
			const first = await text({ label: "First name" });
			const last = await text({ label: "Last name" });

			const profile2 = await group(
				async () => {
					const first = await text({ label: "First name" });
					const last = await text({ label: "Last name" });

					const profile3 = await group(
						async () => {
							const first = await text({ label: "First name" });
							const last = await text({ label: "Last name" });
							return { first, last };
						},
						{ label: "Profile3" }
					);
					const profile4 = await group(
						async () => {
							const first = await text({ label: "First name" });
							const last = await text({ label: "Last name" });
							return { first, last };
						},
						{ label: "Profile4" }
					);
					return { first, last };
				},
				{ label: "Profile2" }
			);

			return { first, last };
		},
		{ label: "Profile" }
	);

	const test = await text({ label: "Test" });

	// Return structured data your way
	return { nickname, profile };
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
