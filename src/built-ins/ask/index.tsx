import { createAsk } from "../../core/ask-factory.js";
import { Box } from "ink";

export interface AskOptions {
	onCancel?: (context: {
		results: Record<string, any>;
		cleanup: () => void;
	}) => void | Promise<void>;
}

export const ask = createAsk<AskOptions, any>({
	type: "flow",

	component: ({ children, onCancelNodes }: any) => {
		// This component now receives the individual prompts as children
		// and controls their layout (flexDirection, spacing, etc.)
		return (
			<>
			<Box flexDirection="column" gap={1}>
				{children}
			</Box>
			{onCancelNodes && onCancelNodes.length > 0 && <Box flexDirection="column">
					{onCancelNodes}
				</Box>}
			</>
		);
	},
});
