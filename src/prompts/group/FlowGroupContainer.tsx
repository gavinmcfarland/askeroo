import React, { useState, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import { TextField } from "../text/TextField.js";
import { ConfirmField } from "../confirm/ConfirmField.js";

interface FlowField {
	id: string;
	message: string;
	type: string;
	initial?: string | boolean;
	value?: string | boolean;
	completed: boolean;
}

interface FlowGroupContainerProps {
	groupName?: string | null;
	fields: FlowField[];
	currentActiveIndex: number;
	onFieldSubmit: (value: string | boolean) => void;
	onNavigateField: () => void; // Now just triggers back navigation
	onBack?: () => void;
	allowBack?: boolean;
}

export function FlowGroupContainer({
	groupName,
	fields,
	currentActiveIndex,
	onFieldSubmit,
	onNavigateField,
	onBack,
	allowBack = true
}: FlowGroupContainerProps) {
	const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});


	// Initialize field values from props
	useEffect(() => {
		const newValues: Record<string, string | boolean> = {};
		fields.forEach(field => {
			if (field.completed && field.value !== undefined) {
				newValues[field.id] = field.value;
			}
		});
		setFieldValues(newValues);
	}, [fields]);


	const handleFieldSubmit = (value: string | boolean) => {
		const currentField = fields[currentActiveIndex];
		if (currentField) {
			setFieldValues(prev => ({
				...prev,
				[currentField.id]: value
			}));
		}
		onFieldSubmit(value);
	};


	const renderField = (field: FlowField, index: number) => {
		// Only ONE field should be active - the current active index
		const isActive = index === currentActiveIndex;
		// A field is completed if it's completed OR if it's before the current active index
		const isCompleted = field.completed || index < currentActiveIndex;
		// A field is disabled if it's beyond the current active index
		const isDisabled = index > currentActiveIndex;

		// Get the current value for this field
		const currentValue = fieldValues[field.id] || field.initial;

		if (field.type === "text") {
			if (isCompleted && !isActive) {
				// Completed state - render as visual only, no useInput hook (prioritize over disabled)
				return (
					<Box key={field.id} flexDirection="column">
						<Text>{field.message}</Text>
						<Text>
							<Text color="green">✓ </Text>
							<Text color="gray">{String(currentValue || "")}</Text>
						</Text>
					</Box>
				);
			} else if (isDisabled) {
				// Disabled state - show the field but grayed out
				return (
					<Box key={field.id} flexDirection="column">
						<Text color="gray">{field.message}</Text>
						<Text color="gray">
							<Text>{">"} </Text>
							<Text dimColor>___</Text>
						</Text>
					</Box>
				);
			} else {
				// Active state
				return (
					<TextField
						key={`${field.id}-active-${currentActiveIndex}`}
						message={field.message}
						initial={String(currentValue || "")}
						onSubmit={handleFieldSubmit}
						onBack={onNavigateField}
						allowBack={true}
					/>
				);
			}
		} else if (field.type === "confirm") {
			if (isCompleted && !isActive) {
				// Completed state - render as visual only, no useInput hook (prioritize over disabled)
				return (
					<Box key={field.id} flexDirection="column">
						<Text>{field.message}</Text>
						<Text>
							<Text color="green">✓ </Text>
							<Text color="gray">{Boolean(currentValue) ? "yes" : "no"}</Text>
						</Text>
					</Box>
				);
			} else if (isDisabled) {
				// Disabled state - show the field but grayed out
				return (
					<Box key={field.id} flexDirection="column">
						<Text color="gray">{field.message}</Text>
						<Text color="gray">
							<Text>{">"} </Text>
							<Text dimColor>___ [y/n]</Text>
						</Text>
					</Box>
				);
			} else {
				// Active state
				return (
					<ConfirmField
						key={`${field.id}-active-${currentActiveIndex}`}
						message={field.message}
						initial={Boolean(currentValue)}
						onSubmit={handleFieldSubmit}
						onBack={onNavigateField}
						allowBack={true}
					/>
				);
			}
		}

		return null;
	};

	return (
		<Box flexDirection="column">
			{groupName && (
				<Box marginTop={1} marginBottom={1}>
					<Text color="green" bold>
						{groupName}:
					</Text>
				</Box>
			)}
			<Box flexDirection="column" gap={1}>
				{fields.map((field, index) => renderField(field, index))}
			</Box>
			<Box marginTop={1}>
				<Text dimColor>
					<Text color="yellow">&lt;enter&gt;</Text> proceed, <Text color="yellow">&lt;escape&gt;</Text> previous field or go back
				</Text>
			</Box>
		</Box>
	);
}