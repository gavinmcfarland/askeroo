import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children?: React.ReactNode;
	hintText?: React.ReactNode;
	completed?: boolean;
	completedFields?: Array<{
		id: string;
		message: string;
		value: any;
		type: string;
	}>;
}

export function GroupContainer({
	groupName,
	children,
	hintText,
	completed = false,
	completedFields = [],
}: GroupContainerProps) {
	// If group is completed, render in completed state
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
				<Box flexDirection="column" gap={1}>
					{completedFields.map((field) => (
						<Box key={field.id} flexDirection="column">
							<Text>{field.message}</Text>
							<Text>
								<Text color="green">✓ </Text>
								<Text color="gray">{field.value}</Text>
							</Text>
						</Box>
					))}
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
