import { Box } from "ink";
import { createAsk } from "../../core/ask-factory.js";
import type { FlowFunction } from "../../types/index.js";

export interface AskOptions {}

export const ask = createAsk<AskOptions & { body: FlowFunction<any> }, any>({
	type: "flow",

	component: ({ node }: any) => {
		return <Box flexDirection="column">{node.children}</Box>;
	},
});
