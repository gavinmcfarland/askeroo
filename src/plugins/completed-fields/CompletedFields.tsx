import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";

export interface CompletedFieldsOptions {
	filter?: string[];
	showGroupHeaders?: boolean;
	maxFields?: number;
	title?: string;
	// Plugin component props
	onSubmit?: (value: void) => void;
	onBack?: () => void;
	completed?: boolean;
	disabled?: boolean;
}

export interface CompletedField {
	id: string;
	groupName?: string;
	label: string;
	shortLabel?: string;
	value: string;
	timestamp: number;
}

// Global state for tracking completed fields from the app
let globalAppState: {
	completedFields: Set<string>;
	fieldValues: Record<string, any>;
	groupNames: Record<string, string>;
	fieldMessages: Record<string, string>;
} = {
	completedFields: new Set(),
	fieldValues: {},
	groupNames: {},
	fieldMessages: {},
};

let globalUpdateListeners: Set<() => void> = new Set();

// Function for PromptApp to update the global state
export function updateAppState(state: typeof globalAppState) {
	globalAppState = { ...state };
	globalUpdateListeners.forEach((listener) => listener());
}

// Main component for the plugin
export function CompletedFieldsDisplay(props: CompletedFieldsOptions) {
	const [appState, setAppState] = useState(globalAppState);

	useEffect(() => {
		const updateListener = () => {
			setAppState({ ...globalAppState });
		};

		globalUpdateListeners.add(updateListener);

		return () => {
			globalUpdateListeners.delete(updateListener);
		};
	}, []);

	// Auto-resolve the prompt without user input
	useEffect(() => {
		if (props.onSubmit && !props.completed && !props.disabled) {
			// Auto-submit immediately when the component mounts
			const timer = setTimeout(() => {
				props.onSubmit!(undefined as any);
			}, 100); // Small delay to ensure rendering

			return () => clearTimeout(timer);
		}
	}, [props.onSubmit, props.completed, props.disabled]);

	// Convert app state to CompletedField objects
	const completedFieldsFromApp = React.useMemo(() => {
		const fields: CompletedField[] = [];

		for (const fieldId of appState.completedFields) {
			if (appState.fieldValues[fieldId] !== undefined) {
				const value = appState.fieldValues[fieldId];
				const message = appState.fieldMessages[fieldId] || fieldId;
				const groupName = appState.groupNames[fieldId];


				fields.push({
					id: fieldId,
					groupName,
					label: message,
					shortLabel:
						message.length > 15
							? message.substring(0, 12) + "..."
							: message,
					value: String(value),
					timestamp: Date.now(), // We don't have timestamps from the app state
				});
			}
		}

		return fields;
	}, [appState]);

	// Filter fields by groups if specified
	const filteredFields = React.useMemo(() => {
		let fields = completedFieldsFromApp;

		// Filter by groups if specified
		if (props.filter && props.filter.length > 0) {
			fields = fields.filter((field) =>
				field.groupName
					? props.filter!.includes(field.groupName)
					: false
			);
		}

		// Limit number of fields if specified
		if (props.maxFields && fields.length > props.maxFields) {
			fields = fields.slice(0, props.maxFields);
		}

		return fields;
	}, [completedFieldsFromApp, props.filter, props.maxFields]);

	// Group fields by group name for rendering
	const groupedFields = React.useMemo(() => {
		const groups: { [groupName: string]: CompletedField[] } = {};

		filteredFields.forEach((field) => {
			const groupName = field.groupName || "Other";
			if (!groups[groupName]) {
				groups[groupName] = [];
			}
			groups[groupName].push(field);
		});

		return groups;
	}, [filteredFields]);

	if (filteredFields.length === 0) {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color="magenta" bold>
						{props.title || "Completed Fields"} (0)
					</Text>
				</Box>
				<Text dimColor>No completed fields yet.</Text>
			</Box>
		);
	}

	// Render without group headers - just a simple list
	if (!props.showGroupHeaders) {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color="magenta" bold>
						{props.title || "Completed Fields"} (
						{filteredFields.length})
					</Text>
				</Box>
				{filteredFields.map((field) => (
					<Box key={field.id} gap={1}>
						<Box width={14}>
							<Text dimColor>
								{field.shortLabel || field.label}
							</Text>
						</Box>
						<Text>
							<Text color="blue">{field.value}</Text>
						</Text>
					</Box>
				))}
			</Box>
		);
	}

	// Render with group headers
	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color="magenta" bold>
					{props.title || "Completed Fields"} ({filteredFields.length}
					)
				</Text>
			</Box>
			{Object.entries(groupedFields).map(([groupName, fields]) => (
				<Box key={groupName} flexDirection="column" marginBottom={1}>
					{groupName !== "Other" && (
						<Box marginBottom={0.5}>
							<Text color="green" bold>
								{groupName}:
							</Text>
						</Box>
					)}
					{fields.map((field) => (
						<Box
							key={field.id}
							gap={1}
							marginLeft={groupName !== "Other" ? 2 : 0}
						>
							<Box width={14}>
								<Text dimColor>
									{field.shortLabel || field.label}
								</Text>
							</Box>
							<Text>
								<Text color="blue">{field.value}</Text>
							</Text>
						</Box>
					))}
				</Box>
			))}
		</Box>
	);
}

// Utility functions for debugging (these are now handled automatically by the app)
export const completedFieldsUtils = {
	// Get current state for debugging
	getAppState: () => ({ ...globalAppState }),

	// Get completed fields as objects for debugging
	getCompletedFields: () => {
		const fields: CompletedField[] = [];
		for (const fieldId of globalAppState.completedFields) {
			if (globalAppState.fieldValues[fieldId] !== undefined) {
				const value = globalAppState.fieldValues[fieldId];
				const message =
					globalAppState.fieldMessages[fieldId] || fieldId;
				const groupName = globalAppState.groupNames[fieldId];

				fields.push({
					id: fieldId,
					groupName,
					label: message,
					shortLabel:
						message.length > 15
							? message.substring(0, 12) + "..."
							: message,
					value: String(value),
					timestamp: Date.now(),
				});
			}
		}
		return fields;
	},
};
