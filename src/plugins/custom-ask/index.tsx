import React from "react";
import { Box } from "ink";
import { createAsk } from "../../core/ask-factory.js";
import type { FlowFunction } from "../../types/index.js";

/**
 * User-provided options for the custom ask plugin
 */
export interface CustomAskOptions {
	/** Custom root container component */
	rootContainer?: React.ComponentType<{ children: React.ReactNode }>;
	/** Additional props to pass to the root container */
	rootContainerProps?: Record<string, any>;
}

/**
 * Default root container component
 */
function DefaultRootContainer({ children }: { children: React.ReactNode }) {
	return <Box flexDirection="column">{children}</Box>;
}

export const ask = createAsk<
	CustomAskOptions & { body: FlowFunction<any> },
	any
>({
	type: "flow",

	component: ({ node, options, events }: any) => {
		const RootContainer = options.rootContainer || DefaultRootContainer;
		const containerProps = options.rootContainerProps || {};

		return (
			<RootContainer {...containerProps}>{node.children}</RootContainer>
		);
	},

	transform: (opts, context, id) => ({
		...opts,
		// Add any transformations if needed
	}),
});
