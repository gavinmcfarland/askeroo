import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import {
	getCompletedFields,
	getCompletedFieldsData,
	getCompletedFieldsState,
	initializeCompletedFieldsStore,
	updateCompletedFieldsState,
} from "./CompletedFieldsStore.js";
// Removed StateRegistry dependency - plugin now gets state directly from tree

export interface CompletedFieldsOptions {
	maxFields?: number;
	onSubmit?: (value: void) => void;
	completed?: boolean;
	disabled?: boolean;
}

export type { CompletedField } from "./CompletedFieldsStore.js";

// Plugin initialization - state is now managed directly by the tree structure

export function CompletedFieldsDisplay(props: CompletedFieldsOptions = {}) {
	const [appState, setAppState] = useState(getCompletedFieldsState);

	useEffect(() => {
		initializeCompletedFieldsStore(setAppState);
	}, []);

	const completedFields = React.useMemo(() => {
		const fields = getCompletedFieldsData();
		return props.maxFields ? fields.slice(0, props.maxFields) : fields;
	}, [appState, props.maxFields]);

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
