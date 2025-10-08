import React from "react";
import { render } from "ink";
import { PromptApp } from "../components/PromptApp.js";
import { debugLogger } from "../utils/logging.js";
import { globalRegistry } from "./registry.js";
import { BackToken, PromptRequest } from "../types/index.js";

// Generate stable IDs for prompts based on content and context
const generatePromptId = (type: string, label: string, groupName?: string) => {
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

// Store reference to the runtime for re-discovery and tree access
let currentRuntime: any = null;

// Create a dynamic UI object that includes plugin handlers
function createUI() {
	const ui: any = {
		/**
		 * Show a group in the UI (called by runtime when executing group plugin)
		 */
		async showGroup(
			label: string | undefined,
			flow?: "phased" | "static",
			id?: string,
			discoveredFields?: Array<{
				id: string;
				label: string;
				type: string;
			}>,
			enableArrowNavigation?: boolean,
			depth?: number,
			parentGroup?: string
		): Promise<void> {
			const groupId = id || generatePromptId("group", label || "group");
			appInstance.currentGroup = groupId;
			const promptFn = await ensureApp();
			await promptFn({
				type: "group",
				id: groupId,
				label: label,
				flow,
				discoveredFields,
				enableArrowNavigation,
				depth,
				groupName: parentGroup, // Pass parent group for proper nesting
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

		getTreeManager(): any {
			// NEW: Expose runtime's tree manager to UI
			return currentRuntime?.getTree?.() || null;
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

		onGroupCompleted(groupId: string): void {
			// Trigger a re-render by sending a UI update event
			ensureApp().then(promptFn => {
				promptFn({
					type: "groupCompleted",
					id: groupId,
				});
			});
		},
	};

	// Create plugin handlers upfront (no Proxy)
	for (const plugin of globalRegistry.getAll()) {
		ui[plugin.type] = async function (
			opts: any,
			currentGroup: string,
			id: string
		): Promise<any> {
			// Always update currentGroup, even if it's undefined
			// This ensures fields outside groups don't inherit the previous group
			appInstance.currentGroup =
				typeof currentGroup === "string" ? currentGroup : undefined;

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
	}

	return ui;
}

// Lazy UI creation to support dynamic plugin registration
let uiInstance: any = null;

function ensureUI() {
	if (!uiInstance) {
		uiInstance = createUI();
	}
	return uiInstance;
}

// Export a lightweight Proxy that lazily creates the UI on first access
// This allows plugins to register before the UI is created
export const ui = new Proxy({} as any, {
	get(_target, prop) {
		return ensureUI()[prop];
	},
});
