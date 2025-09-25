import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children?: React.ReactNode;
	hintText?: React.ReactNode;
	completed?: boolean;
	completedFields?: React.ReactNode[];
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
		return (
			<Box flexDirection="column">
				{groupName && (
					<Box marginTop={1} marginBottom={1}>
						<Text color="green" bold>
							{groupName}:
						</Text>
					</Box>
				)}
				<Box flexDirection="column">
					{completedFields}
				</Box>
			</Box>
		);
	}

	// Active state - show children and hints
	return (
		<Box flexDirection="column">
			{groupName && (
				<Box marginTop={1} marginBottom={1}>
					<Text color="green" bold>
						{groupName}:
					</Text>
				</Box>
			)}
			<Box flexDirection="column">{children}</Box>
			{hintText && (
				<Box marginTop={1}>
					<Text dimColor>{hintText}</Text>
				</Box>
			)}
		</Box>
	);
}
