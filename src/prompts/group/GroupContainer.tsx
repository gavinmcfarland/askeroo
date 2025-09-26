import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children?: React.ReactNode;
	hintText?: React.ReactNode;
	completed?: boolean;
	completedFields?: React.ReactNode[] | null;
}

export function GroupContainer({
	groupName,
	children,
	hintText,
	completed = false,
	completedFields = [],
}: GroupContainerProps) {
	// If group is completed, render the completed field components
	if (completed) {
		// Don't render anything if no completed fields are provided
		if (!completedFields || completedFields.length === 0) {
			return null;
		}

		return (
			<Box flexDirection="row" gap={2}>
				{groupName && (
					<Box width={16}>
						<Text color="gray">{groupName}</Text>
					</Box>
				)}
				<Box flexDirection="column" gap={1}>
					{completedFields}
				</Box>
			</Box>
		);
	}

	// Active state - show children and hints
	return (
		<Box flexDirection="row" gap={2}>
			{groupName && (
				<Box width={14}>
					<Text color="gray">{groupName}</Text>
				</Box>
			)}
			<Box flexDirection="column" gap={1}>
				{children}
				{hintText && (
					<Box>
						<Text dimColor>{hintText}</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
}
