import React from "react";
import { Text, Box } from "ink";
import { createPlugin } from "../../registry.js";
import { getCompletedFieldsData } from "./completed-fields-store.js";

export interface CompletedFieldsOptions {
	filter?: string[];
	maxFields?: number;
}

export type { CompletedField } from "./completed-fields-store.js";

// Internal plugin implementation
const completedFieldsInternal = createPlugin<CompletedFieldsOptions, void>({
	type: "completedFields",
	interactive: false, // Completed fields display doesn't require user interaction

	render: () =>
		function CompletedFieldsDisplay(props: any = {}) {
			// Read directly from tree on each render - simple and reactive
			// Gets fresh data from tree each time component renders (when treeRevision changes in parent)
			const allFields = getCompletedFieldsData();
			const completedFields = props.maxFields
				? allFields.slice(0, props.maxFields)
				: allFields;

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

// Public API
export function completedFields(
	options: CompletedFieldsOptions = {}
): Promise<void> {
	return completedFieldsInternal(options);
}
