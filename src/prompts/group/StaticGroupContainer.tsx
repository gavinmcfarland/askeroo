import React from "react";
import { Text, Box } from "ink";

interface StaticFieldInfo {
	id: string;
	message: string;
	type: string;
	state: "active" | "completed" | "disabled";
	value?: any;
}

interface StaticGroupContainerProps {
	groupName?: string | null;
	fields: StaticFieldInfo[];
	currentFieldId?: string;
}

export function StaticGroupContainer({ groupName, fields, currentFieldId }: StaticGroupContainerProps) {
	return (
		<Box flexDirection="column">
			{groupName && (
				<Box marginTop={1} marginBottom={1}>
					<Text color="green" bold>
						{groupName}:
					</Text>
				</Box>
			)}
			<Box flexDirection="row" gap={2}>
				{fields.map((field) => {
					const isActive = field.id === currentFieldId;
					const isCompleted = field.state === "completed";
					const isDisabled = field.state === "disabled";

					let statusIcon = "> ";
					let textColor = "gray";
					let displayValue = "...";

					if (isCompleted) {
						statusIcon = "✓ ";
						textColor = "green";
						displayValue = typeof field.value === "boolean" ? (field.value ? "Yes" : "No") : String(field.value);
					} else if (isActive) {
						statusIcon = "> ";
						textColor = "yellow";
						displayValue = "...";
					} else if (isDisabled) {
						statusIcon = "> ";
						textColor = "gray";
						displayValue = "...";
					}

					return (
						<Box key={field.id} minWidth={12}>
							<Text color={textColor}>
								{statusIcon}{field.message}
							</Text>
							<Text color={textColor} dimColor={isDisabled}>
								{" "}{displayValue}
							</Text>
						</Box>
					);
				})}
			</Box>
		</Box>
	);
}