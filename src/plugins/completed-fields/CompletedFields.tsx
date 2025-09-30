import React, { useState, useEffect } from "react";
import { Text, Box } from "ink";
import {
	getCompletedFields,
	getCompletedFieldsState,
	initializeCompletedFieldsStore,
	updateCompletedFieldsState,
	CompletedField,
	CompletedFieldsStoreState,
} from "./CompletedFieldsStore.js";
import {
	registerForStateUpdates,
	PromptAppState,
} from "../../core/StateRegistry.js";

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

// CompletedField interface moved to CompletedFieldsStore
export type { CompletedField } from "./CompletedFieldsStore.js";

// Helper functions moved to CompletedFieldsStore

// Store management now handled by CompletedFieldsStore
let globalUpdateListeners: Set<() => void> = new Set();
let storeInitialized = false;

// Register this plugin to receive state updates from PromptApp
let unregisterStateUpdates: (() => void) | null = null;

// Initialize plugin when first imported
if (!storeInitialized) {
	// Register for state updates from PromptApp
	unregisterStateUpdates = registerForStateUpdates(
		(state: PromptAppState) => {
			// Convert PromptApp state to CompletedFieldsStoreState format
			const completedFieldsState: CompletedFieldsStoreState = {
				completedFields: state.fieldState.completed,
				fieldValues: state.fieldState.values,
				groupNames: state.fieldState.groupNames,
				groupIds: state.fieldState.groupIds,
				fieldMessages: state.fieldState.messages,
				fieldProperties: state.fieldState.properties,
			};

			// Update the centralized store
			updateCompletedFieldsState(completedFieldsState);
			globalUpdateListeners.forEach((listener) => listener());
		}
	);

	// Initialize store connection
	initializeCompletedFieldsStore((newState) => {
		// Notify all listeners when store updates
		globalUpdateListeners.forEach((listener) => listener());
	});

	storeInitialized = true;
}

// Legacy function kept for backwards compatibility (now a no-op)
export function updateAppState(state: CompletedFieldsStoreState) {
	// This function is now deprecated - state updates come through the registry
	console.warn(
		"updateAppState is deprecated - completed fields plugin now receives state updates automatically"
	);
}

// Main component for the plugin
export function CompletedFieldsDisplay(props: CompletedFieldsOptions = {}) {
	const [appState, setAppState] = useState<CompletedFieldsStoreState>(() =>
		getCompletedFieldsState()
	);

	useEffect(() => {
		const updateListener = () => {
			setAppState(getCompletedFieldsState());
		};

		// Initialize store connection
		initializeCompletedFieldsStore(setAppState);
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

	// Get completed fields from store
	const completedFieldsFromApp = React.useMemo(() => {
		return getCompletedFields();
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
					{/* {groupName !== "Other" && (
						<Box>
							<Text color="green">{groupName}</Text>
						</Box>
					)} */}
					{fields.map((field) => (
						<Box
							key={field.id}
							gap={1}
							marginLeft={groupName !== "Other" ? 3 : 0}
						>
							<Box width={16}>
								<Text color="gray">
									{field.meta?.group && (
										<Text color="white">
											{field.meta?.group}{" "}
										</Text>
									)}

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

// Utility functions for debugging (these are now handled automatically by the store)
export const completedFieldsUtils = {
	// Get current state for debugging
	getAppState: () => getCompletedFieldsState(),

	// Get completed fields as objects for debugging
	getCompletedFields: () => getCompletedFields(),
};
