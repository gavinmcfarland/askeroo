import React from "react";
import { Text, Box } from "ink";

interface GroupContainerProps {
	groupName: string;
	children: React.ReactNode;
}

export function GroupContainer({ groupName, children }: GroupContainerProps) {
	return (
		<Box flexDirection="column">
			<Box marginTop={1} marginBottom={1}>
				<Text color="green" bold>
					{groupName}:
				</Text>
			</Box>
			<Box>{children}</Box>
		</Box>
	);
}
