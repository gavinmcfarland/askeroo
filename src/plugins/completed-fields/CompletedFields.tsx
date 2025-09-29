import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import { isMarkdownString, MarkdownString } from "../../utils/markdown.js";

export interface CompletedFieldsOptions {
	filter?: string[];
	showGroupHeaders?: boolean;
	maxFields?: number;
	title?: string;
	emptyPlaceholder?: string;
	// Plugin component props
	onSubmit?: (value: void) => void;
	onBack?: () => void;
	completed?: boolean;
	disabled?: boolean;
	meta?: Record<string, any>; // User-defined metadata for this field
}

export interface CompletedField {
	id: string;
	groupName?: string;
	groupId?: string;
	label: string;
	shortLabel?: string;
	value: string;
	formattedValue?: string; // The formatted/display value with labels
	timestamp: number;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Helper functions for formatting values and extracting field messages
function formatValue(value: any, fieldProperties: any): string {
	// Handle empty arrays
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return "None";
		}

		// For multi-select fields, get the labels from the options
		if (
			fieldProperties &&
			fieldProperties.options &&
			Array.isArray(fieldProperties.options)
		) {
			const selectedLabels = value
				.map((val) => {
					const option = fieldProperties.options.find(
						(opt: any) => opt.value === val
					);
					return option ? option.label : val;
				})
				.filter(Boolean);
			return selectedLabels.join(", ");
		}
		return value.join(", ");
	}

	if (typeof value === "boolean") {
		// For confirm fields, try to get the label from options
		if (
			fieldProperties &&
			fieldProperties.options &&
			Array.isArray(fieldProperties.options)
		) {
			const option = fieldProperties.options.find(
				(opt: any) => opt.value === value
			);
			return option ? option.label : value.toString();
		}
		return value ? "Yes" : "No";
	}

	// Handle falsey values (null, undefined, empty string, 0, false)
	if (!value && value !== 0 && value !== false) {
		if (value === null) return "None";
		if (value === undefined) return "Not set";
		if (value === "") return "Empty";
		return "None";
	}

	// For radio fields, get the label from options
	if (
		fieldProperties &&
		fieldProperties.options &&
		Array.isArray(fieldProperties.options)
	) {
		const option = fieldProperties.options.find(
			(opt: any) => opt.value === value
		);
		if (option) {
			return option.label;
		}
	}

	return String(value);
}

function getFieldMessage(fieldProperties: any): string {
	const message = fieldProperties?.label || fieldProperties?.message;

	if (typeof message === "string") {
		return message;
	}

	if (isMarkdownString(message)) {
		// Extract plain text from markdown for the question
		// Remove markdown syntax and return clean text
		return message.content
			.replace(/#+\s*/g, "")
			.replace(/\*\*(.*?)\*\*/g, "$1")
			.replace(/\*(.*?)\*/g, "$1")
			.trim();
	}

	return "Field";
}

// Global state for tracking completed fields from the app
let globalAppState: {
	completedFields: Set<string>;
	fieldValues: Record<string, any>;
	groupNames: Record<string, string>;
	groupIds: Record<string, string>;
	fieldMessages: Record<string, string>;
	fieldProperties: Map<string, any>;
} = {
	completedFields: new Set(),
	fieldValues: {},
	groupNames: {},
	groupIds: {},
	fieldMessages: {},
	fieldProperties: new Map(),
};

let globalUpdateListeners: Set<() => void> = new Set();

// Function for PromptApp to update the global state
export function updateAppState(state: typeof globalAppState) {
	globalAppState = { ...state };
	globalUpdateListeners.forEach((listener) => listener());
}

// Main component for the plugin
export function CompletedFieldsDisplay(props: CompletedFieldsOptions = {}) {
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
				const groupName = appState.groupNames[fieldId];
				const groupId = appState.groupIds[fieldId];

				// Get the original field properties
				const originalProperties =
					appState.fieldProperties.get(fieldId) || {};

				// Use the original field's label and shortLabel properties
				const label =
					originalProperties.label ||
					originalProperties.message ||
					appState.fieldMessages[fieldId] ||
					fieldId;
				const shortLabel = originalProperties.shortLabel;

				// Format the value using the original field properties
				const formattedValue = formatValue(value, originalProperties);

				fields.push({
					id: fieldId,
					groupName,
					groupId,
					label,
					shortLabel,
					value: String(value),
					formattedValue,
					timestamp: Date.now(), // We don't have timestamps from the app state
					meta: originalProperties.meta, // Include meta from original field properties
				});
			}
		}

		return fields;
	}, [appState]);

	// Filter fields by groups if specified
	const filteredFields = React.useMemo(() => {
		let fields = completedFieldsFromApp;

		// Filter by group IDs if specified
		if (props.filter && props.filter.length > 0) {
			fields = fields.filter((field) =>
				field.groupId ? props.filter!.includes(field.groupId) : false
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
		// Only render if title or emptyPlaceholder is defined
		if (!props.title && !props.emptyPlaceholder) {
			return null;
		}

		return (
			<Box flexDirection="column">
				{props.title && (
					<Box marginBottom={1}>
						<Text color="magenta" bold>
							{props.title || "Completed Fields"} (0)
						</Text>
					</Box>
				)}
				{props.emptyPlaceholder && (
					<Text dimColor>{props.emptyPlaceholder}</Text>
				)}
			</Box>
		);
	}

	// Render without group headers - just a simple list
	if (!props.showGroupHeaders) {
		return (
			<Box flexDirection="column">
				{props.title && (
					<Box marginBottom={1}>
						<Text color="magenta" bold>
							{props.title} ({filteredFields.length})
						</Text>
					</Box>
				)}
				{filteredFields.map((field) => (
					<Box key={field.id} gap={1}>
						<Box
							width={16}
							marginLeft={
								field.meta?.depth ? field.meta.depth * 2 : 0
							}
						>
							<Text color="gray">
								{field.shortLabel || field.label}
							</Text>
						</Box>
						<Text>
							<Text color="blue">
								{field.formattedValue || field.value}
							</Text>
						</Text>
					</Box>
				))}
			</Box>
		);
	}

	// Render with group headers
	return (
		<Box flexDirection="column">
			{props.title && (
				<Box marginBottom={1}>
					<Text color="magenta" bold>
						{props.title}
					</Text>
				</Box>
			)}
			{Object.entries(groupedFields).map(([groupName, fields]) => (
				<Box key={groupName} flexDirection="column">
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
							<Box
								width={16}
								marginLeft={
									field.meta?.depth ? field.meta.depth * 2 : 0
								}
							>
								<Text color="gray">
									{field.shortLabel || field.label}
								</Text>
							</Box>
							<Text>
								<Text color="blue">
									{field.formattedValue || field.value}
								</Text>
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
				const groupName = globalAppState.groupNames[fieldId];
				const groupId = globalAppState.groupIds[fieldId];

				// Get the original field properties
				const originalProperties =
					globalAppState.fieldProperties.get(fieldId) || {};

				// Use the original field's label and shortLabel properties
				const label =
					originalProperties.label ||
					originalProperties.message ||
					globalAppState.fieldMessages[fieldId] ||
					fieldId;
				const shortLabel = originalProperties.shortLabel;

				// Format the value using the original field properties
				const formattedValue = formatValue(value, originalProperties);

				fields.push({
					id: fieldId,
					groupName,
					groupId,
					label,
					shortLabel,
					value: String(value),
					formattedValue,
					timestamp: Date.now(),
					meta: originalProperties.meta, // Include meta from original field properties
				});
			}
		}
		return fields;
	},
};
