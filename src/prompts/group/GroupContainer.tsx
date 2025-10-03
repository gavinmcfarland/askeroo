import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children?: React.ReactNode;
	hintText?: React.ReactNode;
	completed?: boolean;
	completedFields?: React.ReactNode[] | null;
	depth?: number;
}

export function GroupContainer({
	groupName,
	children,
	hintText,
	completed = false,
	completedFields = [],
	depth = 0,
}: GroupContainerProps) {
	const indent = 3;
	const depthIndent = depth * indent;
	// Only indent fields within the group if there's a group name
	const fieldIndent = groupName ? indent : 0;

	// If group is completed, render the completed field components
	if (completed) {
		// Don't render anything if no completed fields are provided
		if (!completedFields || completedFields.length === 0) {
			return null;
		}

		return (
			<Box flexDirection="column" marginLeft={depthIndent}>
				{groupName && (
					<Box width={15}>
						<Text color="gray">{groupName}</Text>
					</Box>
				)}
				<Box flexDirection="column" gap={1} marginLeft={fieldIndent}>
					{completedFields}
				</Box>
			</Box>
		);
	}

	// Active state - show children and hints
	return (
		<Box flexDirection="column" marginLeft={depthIndent}>
			{groupName && (
				<Box width={15}>
					<Text color="gray">{groupName}</Text>
				</Box>
			)}
			<Box flexDirection="column" gap={1} marginLeft={fieldIndent}>
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
