import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import {
	getCompletedFields,
	getCompletedFieldsState,
	initializeCompletedFieldsStore,
	updateCompletedFieldsState,
} from "./CompletedFieldsStore.js";
import {
	registerForStateUpdates,
	PromptAppState,
} from "../../core/StateRegistry.js";

export interface CompletedFieldsOptions {
	maxFields?: number;
	onSubmit?: (value: void) => void;
	completed?: boolean;
	disabled?: boolean;
}

export type { CompletedField } from "./CompletedFieldsStore.js";

// Initialize plugin - register for state updates from PromptApp
registerForStateUpdates((state: PromptAppState) => {
	updateCompletedFieldsState({
		fieldState: state.fieldState,
		promptOrderState: state.promptOrderState,
	});
});

export function CompletedFieldsDisplay(props: CompletedFieldsOptions = {}) {
	const [appState, setAppState] = useState(getCompletedFieldsState);

	useEffect(() => {
		initializeCompletedFieldsStore(setAppState);
	}, []);

	const completedFields = React.useMemo(() => {
		const fields = getCompletedFields();
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
