import React from "react";
import { Text, Box } from "ink";
import { getCompletedFieldsData } from "./CompletedFieldsStore.js";

export interface CompletedFieldsOptions {
	maxFields?: number;
	onSubmit?: (value: void) => void;
	completed?: boolean;
	disabled?: boolean;
}

export type { CompletedField } from "./CompletedFieldsStore.js";

// Plugin reads directly from tree via getCompletedFieldsData()
// Component re-renders when parent (PromptApp) re-renders due to treeRevision changes

export function CompletedFieldsDisplay(props: CompletedFieldsOptions = {}) {
	// Read directly from tree on each render - simple and reactive
	// Gets fresh data from tree each time component renders (when treeRevision changes in parent)
	const allFields = getCompletedFieldsData();
	const completedFields = props.maxFields
		? allFields.slice(0, props.maxFields)
		: allFields;

	return (
		<Box flexDirection="column">
			{completedFields.map((field) => (
				<Box key={field.id} gap={1}>
					<Box width={16}>
						<Text color="gray">
							{field.meta?.group && (
								<Text color="white">{field.meta.group} </Text>
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
}
