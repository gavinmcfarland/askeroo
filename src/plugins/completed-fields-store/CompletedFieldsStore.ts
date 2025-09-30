// Completed fields store to manage state at the PromptApp level
// Following the same pattern as TaskStore

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

export interface CompletedFieldsStoreState {
	completedFields: Set<string>;
	fieldValues: Record<string, any>;
	groupNames: Record<string, string>;
	groupIds: Record<string, string>;
	fieldMessages: Record<string, string>;
	fieldProperties: Map<string, any>;
}

// Global store for completed fields state
let globalCompletedFieldsStore: CompletedFieldsStoreState = {
	completedFields: new Set(),
	fieldValues: {},
	groupNames: {},
	groupIds: {},
	fieldMessages: {},
	fieldProperties: new Map(),
};

let updateCompletedFieldsStoreCallback: ((state: CompletedFieldsStoreState) => void) | null = null;

// Initialize the store with PromptApp's state updater
export function initializeCompletedFieldsStore(updater: (state: CompletedFieldsStoreState) => void) {
	updateCompletedFieldsStoreCallback = updater;
}

// Update the completed fields state (called from PromptApp)
export function updateCompletedFieldsState(state: CompletedFieldsStoreState) {
	globalCompletedFieldsStore = { ...state };
	if (updateCompletedFieldsStoreCallback) {
		updateCompletedFieldsStoreCallback({ ...globalCompletedFieldsStore });
	}
}

// Get current completed fields state
export function getCompletedFieldsState(): CompletedFieldsStoreState {
	return { ...globalCompletedFieldsStore };
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

// Get completed fields as formatted objects
export function getCompletedFields(): CompletedField[] {
	const fields: CompletedField[] = [];
	const state = globalCompletedFieldsStore;

	for (const fieldId of state.completedFields) {
		if (state.fieldValues[fieldId] !== undefined) {
			const value = state.fieldValues[fieldId];
			const groupName = state.groupNames[fieldId];
			const groupId = state.groupIds[fieldId];

			// Get the original field properties
			const originalProperties = state.fieldProperties.get(fieldId) || {};

			// Use the original field's label and shortLabel properties
			const label =
				originalProperties.label ||
				originalProperties.message ||
				state.fieldMessages[fieldId] ||
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
}

// Clear all completed fields data (for testing/reset)
export function clearCompletedFieldsStore() {
	globalCompletedFieldsStore = {
		completedFields: new Set(),
		fieldValues: {},
		groupNames: {},
		groupIds: {},
		fieldMessages: {},
		fieldProperties: new Map(),
	};

	if (updateCompletedFieldsStoreCallback) {
		updateCompletedFieldsStoreCallback({ ...globalCompletedFieldsStore });
	}
}