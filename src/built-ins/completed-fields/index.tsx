import React, { useEffect, useMemo } from "react";
import { Text, Box } from "ink";
import { createPrompt } from "../../core/registry.js";
import { completedFieldsStore } from "./completed-fields-store.js";

// Type for completed field data (matches getCompletedFieldsData return type)
type CompletedFieldData = {
	id: string;
	label: string;
	value: any;
	formattedValue?: string;
	groupLabel?: string;
	shortLabel?: string;
	meta?: Record<string, any>;
};

/**
 * User-provided options for the completed fields plugin
 */
export interface CompletedFieldsOptions {
	filter?: string[];
	maxFields?: number;
}

// Completed fields display plugin
export const completedFields = createPrompt<CompletedFieldsOptions, void>({
	type: "completedFields",

	component: ({ node, options, events }: any) => {
		// Subscribe to the completed fields store
		const store = completedFieldsStore.use();

		// Extract completed fields data from the tree
		const allFields = useMemo(() => {
			if (!store.treeManager) {
				return [];
			}

			const completedFields: Array<any> = [];
			store.treeManager.traverseDepthFirst((treeNode) => {
				if (
					treeNode.type === "field" &&
					treeNode.completed &&
					!treeNode.excludeFromCompleted &&
					!treeNode.hideOnCompletion &&
					treeNode.value !== undefined
				) {
					const fieldProperties = treeNode.properties || {};
					const label =
						fieldProperties.label ||
						fieldProperties.message ||
						treeNode.label ||
						`${treeNode.fieldType} field`;
					const shortLabel = fieldProperties.shortLabel;

					// Helper to format values
					const formatValue = (value: any, props: any): string => {
						if (Array.isArray(value)) {
							if (value.length === 0) return "None";
							if (
								props?.options &&
								Array.isArray(props.options)
							) {
								const selectedLabels = value
									.map((val) => {
										const option = props.options.find(
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
								props?.options &&
								Array.isArray(props.options)
							) {
								const option = props.options.find(
									(opt: any) => opt.value === value
								);
								return option
									? option.label
									: value
									? "Yes"
									: "No";
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
						if (props?.options && Array.isArray(props.options)) {
							const option = props.options.find(
								(opt: any) => opt.value === value
							);
							if (option) {
								return option.label;
							}
						}

						return String(value);
					};

					completedFields.push({
						id: treeNode.id,
						label,
						shortLabel,
						value: treeNode.value,
						formattedValue: formatValue(
							treeNode.value,
							fieldProperties
						),
						groupLabel:
							treeNode.parent?.type === "group"
								? treeNode.parent.label
								: undefined,
						meta: fieldProperties.meta,
					});
				}
			});

			return completedFields;
		}, [store.treeManager, store.revision]);

		const completedFieldsList = options.maxFields
			? allFields.slice(0, options.maxFields)
			: allFields;

		// Auto-submit when component becomes active
		useEffect(() => {
			if (node.state === "active" && events.onSubmit) {
				// setTimeout is now baked into onSubmit for auto submissions
				events.onSubmit({ type: "auto" });
			}
		}, [node.state, events.onSubmit]);

		if (completedFieldsList.length === 0) return null;

		return (
			<Box flexDirection="column">
				{completedFieldsList.map((field) => (
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
