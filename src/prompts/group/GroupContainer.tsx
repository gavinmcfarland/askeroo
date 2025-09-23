import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName?: string | null;
	children: React.ReactNode;
}

export function GroupContainer({ groupName, children }: GroupContainerProps) {
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
				{children}
			</Box>
		</Box>
	);
}
