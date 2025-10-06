import { Box, Text } from "ink";
import { createAsk } from "../../core/ask-factory.js";
import type { FlowFunction } from "../../types/index.js";

export interface AskOptions {}

export const ask = createAsk<AskOptions, any>({
	type: "flow",

	component: ({ children }: any) => {
		return (
			<Box flexDirection="row">
				<Text color="magenta" bold>
					🚀 Custom Container
				</Text>
				{children}
			</Box>
		);
	},
});
