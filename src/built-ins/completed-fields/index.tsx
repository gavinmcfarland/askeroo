import React, { useEffect } from "react";
import { Text, Box } from "ink";
import { createPrompt } from "../../core/registry.js";
import { getCompletedFieldsData } from "./completed-fields-store.js";
import { usePromptData } from "../../core/plugin-state-context.js";

// Type for completed field data (matches getCompletedFieldsData return type)
type CompletedFieldData = {
	id: string;
	label: string;
	value: any;
	formattedValue?: string;
	groupLabel?: string;
	shortLabel?: string;
	meta?: Record<string, any>;
};

/**
 * User-provided options for the completed fields plugin
 */
export interface CompletedFieldsOptions {
	filter?: string[];
	maxFields?: number;
}

// Completed fields display plugin
export const completedFields = createPrompt<CompletedFieldsOptions, void>({
	type: "completedFields",

	component: ({ node, options, events }: any) => {
		// Subscribe to prompt state and read data in one line!
		const allFields = usePromptData(() => getCompletedFieldsData());
		const completedFieldsList = options.maxFields
			? allFields.slice(0, options.maxFields)
			: allFields;

		// Auto-submit when component becomes active
		useEffect(() => {
			if (node.state === "active" && events.onSubmit) {
				const timer = setTimeout(() => {
					events.onSubmit({ type: "auto" });
				}, 10);
				return () => clearTimeout(timer);
			}
		}, [node.state, events.onSubmit]);

		if (completedFieldsList.length === 0) return null;

		return (
			<Box flexDirection="column">
				{completedFieldsList.map((field) => (
					<Box key={field.id} gap={1}>
						<Box width={16}>
							<Text color="gray">
								{field.meta?.group && (
									<Text color="white">
										{field.meta.group}{" "}
									</Text>
								)}
								{field.shortLabel || field.label}
							</Text>
						</Box>
						<Text color="blue">
							{field.formattedValue || field.value}
						</Text>
					</Box>
				))}
			</Box>
		);
	},
});
