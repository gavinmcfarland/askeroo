import React from "react";
import { Text, Box } from "ink";

interface HintTextProps {
	children: React.ReactNode;
}

function HintText({ children }: HintTextProps) {
	return (
		<Box>
			<Text dimColor>{children}</Text>
		</Box>
	);
}

interface GroupContainerProps {
	groupName?: string | null;
	children?: React.ReactNode;
	hintText?: React.ReactNode;
	completed?: boolean;
	completedFields?: React.ReactNode[] | null;
	depth?: number; // Add depth for nesting levels
}

export function GroupContainer({
	groupName,
	children,
	hintText,
	completed = false,
	completedFields = [],
	depth = 0,
}: GroupContainerProps) {
	// Calculate indentation based on depth
	const baseIndent = depth * 3; // 3 spaces per nesting level

	// If group is completed, render the completed field components
	if (completed) {
		// Don't render anything if no completed fields are provided
		if (!completedFields || completedFields.length === 0) {
			return null;
		}

		return (
			<Box flexDirection="column">
				{groupName && (
					<Box width={15} marginLeft={baseIndent}>
						<Text color="gray">{groupName}</Text>
					</Box>
				)}
				<Box
					flexDirection="column"
					gap={1}
					marginLeft={groupName ? baseIndent + 3 : baseIndent}
				>
					{completedFields}
				</Box>
			</Box>
		);
	}

	// Active state - show children and hints
	return (
		<Box flexDirection="column">
			{groupName && (
				<Box width={15} marginLeft={baseIndent}>
					<Text color="gray">{groupName}</Text>
				</Box>
			)}
			<Box
				flexDirection="column"
				gap={1}
				marginLeft={groupName ? baseIndent + 3 : baseIndent}
			>
				{children}
				{hintText && <HintText>{hintText}</HintText>}
			</Box>
		</Box>
	);
}
