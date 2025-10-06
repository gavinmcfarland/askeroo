import { createAsk } from "../../core/ask-factory.js";
import { Box } from "ink";

export interface AskOptions {}

export const ask = createAsk<AskOptions, any>({
	type: "flow",

	component: ({ children }: any) => {
		// This component now receives the individual prompts as children
		// and controls their layout (flexDirection, spacing, etc.)
		return (
			<Box flexDirection="column" gap={1}>
				{children}
			</Box>
		);
	},
});
