// Completed fields store to manage state at the PromptApp level
// Following the same pattern as TaskStore

// Define FieldState interface locally since StateRegistry is being removed
interface FieldState {
	values: Record<string, any>;
	visited: Set<string>;
	completed: Set<string>;
	properties: Map<string, any>;
	messages: Record<string, string>;
	groupNames: Record<string, string>;
	groupIds: Record<string, string>;
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

export interface CompletedFieldsStoreState {
	fieldState: FieldState;
	promptOrderState?: {
		rootFieldHistory: Array<{
			id: string;
			label: string;
			type: string;
			hideAfterSubmit?: boolean;
		}>;
		groupFieldHistory: Map<
			string,
			Array<{
				id: string;
				label: string;
				type: string;
				hideAfterSubmit?: boolean;
			}>
		>;
	};
}

// Global store for completed fields state
let globalCompletedFieldsStore: CompletedFieldsStoreState = {
	fieldState: {
		values: {},
		visited: new Set(),
		completed: new Set(),
		properties: new Map(),
		messages: {},
		groupNames: {},
		groupIds: {},
	},
	promptOrderState: {
		rootFieldHistory: [],
		groupFieldHistory: new Map(),
	},
};

let updateCompletedFieldsStoreCallback:
	| ((state: CompletedFieldsStoreState) => void)
	| null = null;

// Initialize the store with PromptApp's state updater (legacy support)
export function initializeCompletedFieldsStore(
	updater: (state: CompletedFieldsStoreState) => void
) {
	updateCompletedFieldsStoreCallback = updater;
}

// Update the completed fields state (called from tree-based state management)
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
	const { fieldState, promptOrderState } = globalCompletedFieldsStore;

	// Helper function to create field object
	const createField = (
		fieldId: string,
		index: number
	): CompletedField | null => {
		if (
			!fieldState.completed.has(fieldId) ||
			fieldState.values[fieldId] === undefined
		) {
			return null;
		}

		const value = fieldState.values[fieldId];
		const groupName = fieldState.groupNames[fieldId];
		const groupId = fieldState.groupIds[fieldId];

		// Get the original field properties
		const originalProperties = fieldState.properties.get(fieldId) || {};

		// Use the original field's label and shortLabel properties
		const label =
			originalProperties.label ||
			originalProperties.message ||
			fieldState.messages[fieldId] ||
			fieldId;
		const shortLabel = originalProperties.shortLabel;

		// Format the value using the original field properties
		const formattedValue = formatValue(value, originalProperties);

		return {
			id: fieldId,
			groupName,
			groupId,
			label,
			shortLabel,
			value: String(value),
			formattedValue,
			timestamp: index, // Use index as ordering timestamp
			meta: originalProperties.meta, // Include meta from original field properties
		};
	};

	// Use ordering information if available
	if (
		promptOrderState?.rootFieldHistory &&
		promptOrderState?.groupFieldHistory
	) {
		// Create a combined chronological list
		const allFieldsInOrder: Array<{
			id: string;
			type: "root" | "group";
			groupId?: string;
		}> = [];

		// Add root fields with their position markers
		promptOrderState.rootFieldHistory.forEach((fieldInfo) => {
			allFieldsInOrder.push({ id: fieldInfo.id, type: "root" });
		});

		// Add group fields with their position markers
		for (const [
			groupId,
			groupFields,
		] of promptOrderState.groupFieldHistory) {
			groupFields.forEach((fieldInfo) => {
				allFieldsInOrder.push({
					id: fieldInfo.id,
					type: "group",
					groupId,
				});
			});
		}

		// Sort by completion timestamp (when they were actually completed)
		allFieldsInOrder.sort((a, b) => {
			// Get the completion order from the Set iteration order
			const aCompleted = Array.from(fieldState.completed).indexOf(a.id);
			const bCompleted = Array.from(fieldState.completed).indexOf(b.id);
			return aCompleted - bCompleted;
		});

		// Create fields in the correct chronological order
		allFieldsInOrder.forEach((fieldInfo, index) => {
			const field = createField(fieldInfo.id, index);
			if (field) {
				fields.push(field);
			}
		});
	} else {
		// Fallback to old behavior if ordering info is not available
		let index = 0;
		for (const fieldId of fieldState.completed) {
			const field = createField(fieldId, index++);
			if (field) {
				fields.push(field);
			}
		}
	}

	return fields;
}

// Clear all completed fields data (for testing/reset)
export function clearCompletedFieldsStore() {
	globalCompletedFieldsStore = {
		fieldState: {
			values: {},
			visited: new Set(),
			completed: new Set(),
			properties: new Map(),
			messages: {},
			groupNames: {},
			groupIds: {},
		},
		promptOrderState: {
			rootFieldHistory: [],
			groupFieldHistory: new Map(),
		},
	};

	if (updateCompletedFieldsStoreCallback) {
		updateCompletedFieldsStoreCallback({ ...globalCompletedFieldsStore });
	}
}
