#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/plugins/multi/index.js";

const flow = async () => {
	const first = await text({ label: "What's your name?" });

	const projectInfo = await group(
		async () => {
			return {
				type: await text({ label: "Project type" }),
				useTypeScript: await confirm({ message: "Use TypeScript?" }),
				features: await multi({
					message: "Select features",
					options: ["Auth", "Database", "Testing", "API"],
				}),
				framework: await text({ label: "Framework" }),
			};
		},
		{
			message: "Project Configuration",
		} // Using default "progressive" flow
	);

	const email = await text({ label: "Your email?" });

	return { first, projectInfo, email };
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
