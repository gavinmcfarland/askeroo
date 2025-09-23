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
			}>
		): Promise<void> {
			appInstance.currentGroup = label;
			const promptFn = await ensureApp();
			await promptFn({
				type: "group",
				id: id || generatePromptId("group", label || "group"),
				message: label,
				flow,
				discoveredFields,
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
	};

	// Dynamically add plugin UI handlers
	const pluginHandlers = globalRegistry.getUIHandlers();

	// Create generic UI handlers for all registered plugins
	//   console.log('Registered plugins:', globalRegistry.getAll().map(p => p.type));
	for (const plugin of globalRegistry.getAll()) {
		// console.log("Creating UI handler for:", plugin.type);
		(baseUI as any)[plugin.type] = async function (
			msg: string,
			...args: any[]
		): Promise<any> {
			const groupContext = args[args.length - 2]; // Second to last arg is usually groupContext
			const id = args[args.length - 1]; // Last arg is usually id

			if (typeof groupContext === "string") {
				appInstance.currentGroup = groupContext;
			}

			const promptFn = await ensureApp();

			// Create the request object with the message and any additional args
			const request: PromptRequest = {
				type: plugin.type,
				id:
					(typeof id === "string" ? id : undefined) ||
					generatePromptId(plugin.type, msg),
				message: msg,
				groupName: appInstance.currentGroup,
			};

			// Add any additional properties from args (excluding groupContext and id)
			const additionalArgs = args.slice(0, -2);
			additionalArgs.forEach((arg, index) => {
				if (arg !== undefined) {
					// Map common argument positions to known properties
					if (plugin.type === "customText") {
						if (index === 0) request.placeholder = arg;
						if (index === 1) request.prefix = arg;
					} else if (plugin.type === "validatedText") {
						if (index === 0) request.validate = arg;
						if (index === 1) request.transform = arg;
					} else if (plugin.type === "multi") {
						if (index === 0) request.options = arg;
					} else {
						// For other plugins, use generic property names
						(request as any)[`arg${index}`] = arg;
					}
				}
			});

			return promptFn(request);
		};
	}

	return { ...baseUI, ...pluginHandlers };
}

export const ui = createUI();
