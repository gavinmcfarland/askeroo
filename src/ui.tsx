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
	message?: string;
	groupName?: string;
	flow?: "phased" | "static";
	discoveredFields?: Array<{ id: string; message: string; type: string }>;
	[key: string]: any; // Allow any plugin-specific properties
};

// Generate stable IDs for prompts based on content and context
const generatePromptId = (
	type: string,
	message: string,
	groupName?: string
) => {
	const parts = [type, message];
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
				message: string;
				type: string;
			}>,
			enableArrowNavigation?: boolean
		): Promise<void> {
			appInstance.currentGroup = label;
			const promptFn = await ensureApp();
			await promptFn({
				type: "group",
				id: id || generatePromptId("group", label || "group"),
				message: label,
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
			const promptFn = await ensureApp();
			await promptFn({
				type: "completeFlow",
				id: "flow-completion",
			});
		},
	};

	// Create dynamic UI handlers for all registered plugins

	// Create generic UI handlers for all registered plugins
	//   console.log('Registered plugins:', globalRegistry.getAll().map(p => p.type));
	for (const plugin of globalRegistry.getAll()) {
		// console.log("Creating UI handler for:", plugin.type);
		(baseUI as any)[plugin.type] = async function (
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
				id: id || generatePromptId(plugin.type, opts.message || `${plugin.type} field`),
				groupName: appInstance.currentGroup,
				...opts // Spread all options from the plugin
			};

			return promptFn(request);
		};
	}

	return baseUI;
}

export const ui = createUI();
