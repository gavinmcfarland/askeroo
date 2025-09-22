import React from "react";
import { Box } from "ink";

interface RootContainerProps {
	children: React.ReactNode;
}

export function RootContainer({ children }: RootContainerProps) {
	return (
		<Box flexDirection="column" gap={1}>
			{children}
		</Box>
	);
}