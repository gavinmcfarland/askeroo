import { PromptRuntime } from "./core/PromptRuntime.js";
import { setCurrentRuntime } from "./registry.js";
import { UI } from "./types/index.js";

// Export the PromptRuntime class for advanced users
export { PromptRuntime };

/**
 * Create a new prompt runtime
 *
 * Factory function that creates and returns a PromptRuntime instance.
 * This provides the main API for executing prompt flows.
 *
 * @param ui - The UI implementation to use
 * @returns Runtime instance with ask, group, and plugin methods
 */
export function createRuntime(ui: UI) {
	const runtime = new PromptRuntime(ui);

	// Create the public API object
	const api = {
		ask: runtime.ask.bind(runtime),
		group: runtime.group.bind(runtime),
		BACK: runtime.BACK,
		rediscoverStaticGroupFields:
			runtime.rediscoverStaticGroupFields.bind(runtime),
		// Expose plugin prompts dynamically
		...runtime.getPluginPrompts(),
	};

	// Set the API object as the current runtime so plugins can access it
	setCurrentRuntime(api);

	return api;
}

export { createRuntime as default };
