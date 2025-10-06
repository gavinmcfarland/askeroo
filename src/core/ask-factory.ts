import React from "react";
import { createRuntime } from "./core.js";
import { ui } from "./ui.js";
import type { FlowFunction, PluginComponentProps } from "../types/index.js";

/**
 * Factory function for creating standalone ask functions with custom configurations
 * All createAsk functions work the same way - they create their own runtime context and execute flows
 */
export function createAsk<T = any, R = any>(config: {
	type: string;
	component?:
		| React.ComponentType<PluginComponentProps<T, R>>
		| ((props: any) => React.ReactElement | null);
	transform?: (opts: T, context: { currentGroup?: string }, id: string) => T;
	onEnter?: (runtime: any, opts: T) => Promise<void> | void;
	onExit?: (runtime: any, opts: T) => Promise<void> | void;
}): (flow: FlowFunction<any>, opts?: T) => Promise<any> {
	return (flow: FlowFunction<any>, opts?: T) => {
		// Store the custom root container globally so the UI can access it
		const originalRootContainer = (globalThis as any).__customRootContainer;
		const originalRootContainerProps = (globalThis as any)
			.__customRootContainerProps;

		// Set the custom root container if provided in options
		if (opts && typeof opts === "object" && "rootContainer" in opts) {
			(globalThis as any).__customRootContainer = (
				opts as any
			).rootContainer;
			(globalThis as any).__customRootContainerProps =
				(opts as any).rootContainerProps || {};
		}

		try {
			// Create a runtime with the standard UI (which will now use our custom root container)
			const runtime = createRuntime(ui);

			// Execute the flow with the custom runtime
			return runtime.executeFlow(flow);
		} finally {
			// Restore the original root container
			(globalThis as any).__customRootContainer = originalRootContainer;
			(globalThis as any).__customRootContainerProps =
				originalRootContainerProps;
		}
	};
}
