import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children: React.ReactNode;
	hintText?: React.ReactNode;
}

export function GroupContainer({
	groupName,
	children,
	hintText,
}: GroupContainerProps) {
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
