#!/usr/bin/env node
import { ask, group } from "../src/index.js";
import { multi } from "../src/built-ins/multi/index.js";

const hiddenSearchIntegrations = [
	"Slack",
	"GitHub",
	"GitLab",
	"Bitbucket",
	"Jira",
	"Linear",
	"Notion",
	"PagerDuty",
	"Opsgenie",
	"Zendesk",
	"Salesforce",
	"HubSpot",
];

const filterModeDatasets = [
	{
		value: "customers",
		label: "Customers",
		hint: "Profiles and lifecycle events",
	},
	{ value: "sessions", label: "Sessions", hint: "Aggregated product usage" },
	{
		value: "billing",
		label: "Billing",
		hint: "Invoices and payment history",
	},
	{ value: "support", label: "Support", hint: "Tickets and resolutions" },
	{
		value: "experiments",
		label: "Experiments",
		hint: "Feature flag cohorts",
	},
	{ value: "marketing", label: "Marketing", hint: "Campaign performance" },
	{ value: "warehouse", label: "Warehouse", hint: "Raw event stream" },
	{ value: "finance", label: "Finance", hint: "Revenue and expenses" },
];

const flow = async () => {
	const answers = await group(
		async () => {
			const basicSkills = await multi({
				label: "Basic",
				options: [
					"TypeScript",
					"JavaScript",
					"Go",
					"Rust",
					"Python",
					"Kotlin",
				],
			});

			const allowLoop = await multi({
				label: "Allow Loop",
				options: [
					"TypeScript",
					"JavaScript",
					"Go",
					"Rust",
					"Python",
					"Kotlin",
				],
				allowLoop: true,
			});

			const integrationRollout = await multi({
				label: "Max Visible",
				options: hiddenSearchIntegrations,
				searchable: true,
				maxVisible: 5,
			});

			const hintInline = await multi({
				label: "Hint Inline",
				shortLabel: "Hint Bottom",
				options: filterModeDatasets,
				hintPosition: "inline-fixed",
			});

			const hintBottom = await multi({
				label: "Hint Bottom",
				shortLabel: "Hint Bottom",
				options: filterModeDatasets,
				hintPosition: "bottom",
			});

			const dataPipelines = await multi({
				label: "None Option",
				shortLabel: "Datasets",
				options: filterModeDatasets,
				noneOption: { label: "None" },
			});
		},
		{ flow: "phased", hideOnCompletion: true }
	);
};

(async () => {
	try {
		await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
