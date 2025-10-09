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
							return value ? "Yes" : "No";
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
