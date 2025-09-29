#!/usr/bin/env node
import {
	ask,
	group,
	text,
	radio,
	multi,
	confirm,
} from "../src/index.js";
import { completedFields } from "../src/plugins/completed-fields/index.js";

const flow = async () => {
	await completedFields();

	const answers = await group(
		async () => {
			// Text field with meta property
			const name = await text({
				label: "What's your name?",
				shortLabel: "Name",
				meta: {
					category: "personal",
					required: true,
					validation: "string",
					customId: "user-name"
				}
			});

			// Radio field with meta property
			const role = await radio({
				label: "What's your role?",
				shortLabel: "Role",
				options: [
					{ value: "developer", label: "Developer" },
					{ value: "designer", label: "Designer" },
					{ value: "manager", label: "Manager" },
				],
				meta: {
					category: "professional",
					priority: "high",
					trackingId: "role-selection"
				}
			});

			// Multi-select field with meta property
			const skills = await multi({
				label: "What are your skills?",
				shortLabel: "Skills",
				options: [
					{ value: "js", label: "JavaScript" },
					{ value: "ts", label: "TypeScript" },
					{ value: "react", label: "React" },
					{ value: "node", label: "Node.js" },
				],
				meta: {
					category: "technical",
					maxSelections: 5,
					analyticsEvent: "skills-selected"
				}
			});

			// Confirm field with meta property
			const ready = await confirm({
				label: "Are you ready to proceed?",
				shortLabel: "Ready",
				meta: {
					category: "confirmation",
					critical: true,
					stepId: "final-confirmation"
				}
			});

			return { name, role, skills, ready };
		},
		{ flow: "progressive" }
	);

	return answers;
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nResult:", JSON.stringify(result, null, 2));

		// Demonstrate accessing meta properties through completedFields utils
		const { completedFieldsUtils } = await import("../src/plugins/completed-fields/CompletedFields.js");
		const completedFieldsData = completedFieldsUtils.getCompletedFields();

		console.log("\nCompleted fields with meta:");
		completedFieldsData.forEach(field => {
			console.log(`- ${field.label}: ${field.formattedValue}`);
			if (field.meta) {
				console.log(`  Meta:`, field.meta);
			}
		});
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();