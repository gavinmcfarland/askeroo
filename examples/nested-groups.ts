import { ask, group, text, confirm, note } from "../src/index.js";

const flow = async () => {
	// Display notes
	await note("[Nested Groups]{dim}");

	// Create conditional inputs
	const answers = await group(async () => {
		const role = await text({ label: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ label: "Access code" });
			return { role, code };
		}
		const news = await confirm({ label: "Subscribe to newsletter?" });

		const answers = await group(
			async () => {
				const role = await text({ label: "Role (user/admin)" });
				if (role === "admin") {
					const code = await text({ label: "Access code" });
					return { role, code };
				}
				const news = await confirm({
					label: "Subscribe to newsletter?",
				});

				const answers = await group(
					async () => {
						const role = await text({
							label: "Role (user/admin)",
						});
						if (role === "admin") {
							const code = await text({
								label: "Access code",
							});
							return { role, code };
						}
						const news = await confirm({
							label: "Subscribe to newsletter?",
						});
						return { role, news };
					},
					{ label: "Group" } // Optional group labels
				);
				return { role, news };
			},
			{ label: "Group" } // Optional group labels
		);
		return { role, news };
	});

	// Return structured data your way
	return { answers };
};

const result = await ask(flow);
console.log(result);
