import { Box, Text } from "ink";

interface CompletedGroupProps {
	groupName?: string | null;
	completedFields: Array<{
		id: string;
		message: string;
		value: any;
		type: string;
	}>;
}

export function CompletedGroup({ groupName, completedFields }: CompletedGroupProps) {
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