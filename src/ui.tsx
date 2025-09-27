import React from "react";
import { render } from "ink";
import { PromptApp } from "./prompts/shared/PromptApp.js";
import { debugLogger } from "./debug.js";
import { globalRegistry } from "./registry.js";

type BackToken = { __back: true };

// Generic prompt request that works with any plugin
type PromptRequest = {
	type: string;
	id: string;
	label?: string;
	groupName?: string;
	flow?: "phased" | "static";
	discoveredFields?: Array<{ id: string; label: string; type: string }>;
	[key: string]: any; // Allow any plugin-specific properties
};

// Generate stable IDs for prompts based on content and context
const generatePromptId = (
	type: string,
	label: string,
	groupName?: string
) => {
	const parts = [type, label];
	if (groupName) parts.push(`group:${groupName}`);
	return parts.join("|");
};

let appInstance: {
	promptFn?: (request: PromptRequest) => Promise<any>;
	unmount?: () => void;
	currentGroup?: string;
} = {};

function ensureApp(): Promise<(request: PromptRequest) => Promise<any>> {
	return new Promise((resolve) => {
		if (appInstance.promptFn) {
			resolve(appInstance.promptFn);
			return;
		}

		const { unmount } = render(
			<PromptApp
				onReady={(promptFn) => {
					appInstance.promptFn = promptFn;
					appInstance.unmount = unmount;
					resolve(promptFn);
				}}
			/>
		);
	});
}

// Store reference to the runtime for re-discovery
let currentRuntime: any = null;

// Create a dynamic UI object that includes plugin handlers
function createUI() {
	const baseUI = {
		async showGroup(
			label: string | undefined,
			flow?: "phased" | "static",
			id?: string,
			discoveredFields?: Array<{
				id: string;
				label: string;
				type: string;
			}>,
			enableArrowNavigation?: boolean
		): Promise<void> {
			appInstance.currentGroup = label;
			const promptFn = await ensureApp();
			await promptFn({
				type: "group",
				id: id || generatePromptId("group", label || "group"),
				label: label,
				flow,
				discoveredFields,
				enableArrowNavigation,
			});
		},

		clearGroup(): void {
			appInstance.currentGroup = undefined;
		},

		cleanup(): void {
			if (appInstance.unmount) {
				debugLogger.log("UI_CLEANUP", "UI cleanup triggered");
				appInstance.unmount();
				appInstance.promptFn = undefined;
				appInstance.unmount = undefined;
				appInstance.currentGroup = undefined;
				debugLogger.cleanup();
			}
		},

		setRuntime(runtime: any): void {
			currentRuntime = runtime;
		},

		async rediscoverStaticGroup(groupId: string) {
			if (currentRuntime?.rediscoverStaticGroupFields) {
				return await currentRuntime.rediscoverStaticGroupFields(
					groupId
				);
			}
			return null;
		},

		async completeFlow(): Promise<void> {
			// Check for incomplete tasks before completing the flow
			try {
				const { hasIncompleteTasks } = await import('./plugins/tasks/index.js');
				if (hasIncompleteTasks()) {
					// Don't complete the flow if there are incomplete tasks
					// Wait a bit and check again (for dynamic tasks that might be added)
					await new Promise(resolve => setTimeout(resolve, 100));
					if (hasIncompleteTasks()) {
						return;
					}
				}
			} catch (error) {
				// If tasks module isn't available, proceed normally
			}

			const promptFn = await ensureApp();
			await promptFn({
				type: "completeFlow",
				id: "flow-completion",
			});
		},
	};

	// Create a Proxy to dynamically handle plugin methods
	return new Proxy(baseUI, {
		get(target: any, prop: string) {
			// If the property exists on baseUI, return it
			if (prop in target) {
				return target[prop];
			}

			// Check if this is a registered plugin type
			const plugin = globalRegistry.get(prop);
			if (plugin) {
				// Create and cache the handler
				target[prop] = async function (
					opts: any,
					currentGroup: string,
					id: string
				): Promise<any> {
					if (typeof currentGroup === "string") {
						appInstance.currentGroup = currentGroup;
					}

					const promptFn = await ensureApp();

					// Create the request object with all options spread in
					const request: PromptRequest = {
						type: plugin.type,
						id:
							id ||
							generatePromptId(
								plugin.type,
								opts.label || `${plugin.type} field`
							),
						groupName: appInstance.currentGroup,
						...opts, // Spread all options from the plugin
					};

					return promptFn(request);
				};
				return target[prop];
			}

			// Return undefined for unknown properties
			return undefined;
		},
	});
}

export const ui = createUI();
