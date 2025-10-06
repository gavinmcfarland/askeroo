import React from "react";
import { Text, Box } from "ink";
import { createPrompt } from "../../core/registry.js";
import { getCompletedFieldsData } from "./completed-fields-store.js";

/**
 * User-provided options for the completed fields plugin
 */
export interface CompletedFieldsOptions {
	filter?: string[];
	maxFields?: number;
}

export type { CompletedField } from "./completed-fields-store.js";

// Completed fields display plugin
export const completedFields = createPrompt<CompletedFieldsOptions, void>({
	type: "completedFields",
	autoSubmit: true,

	component: ({ node, options, events }: any) => {
		const allFields = getCompletedFieldsData();
		const completedFields = options.maxFields
			? allFields.slice(0, options.maxFields)
			: allFields;

		if (completedFields.length === 0) return null;

		return (
			<Box flexDirection="column">
				{completedFields.map((field: any) => (
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
