import { PromptRuntime } from "./prompt-runtime.js";
import { RuntimeFactory } from "./runtime-factory.js";
import { UI } from "../types/index.js";

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
	return RuntimeFactory.createRuntime(ui);
}

export { createRuntime as default };
