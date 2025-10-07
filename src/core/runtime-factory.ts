/**
 * RuntimeFactory - Creates and configures runtime instances
 *
 * Handles runtime instantiation, API binding, and dependency injection.
 * Manages the lifecycle of runtime creation and registration.
 *
 * Note: This factory is decoupled from plugin implementations. Plugins are
 * loaded via default-plugins.ts which is imported from index.ts. This allows
 * the runtime to be plugin-agnostic while maintaining a clean separation of
 * concerns.
 */

import { PromptRuntime } from "./prompt-runtime.js";
import { setCurrentRuntime, type RuntimeAPI } from "./runtime-context.js";
import { UI } from "../types/index.js";

export class RuntimeFactory {
	/**
	 * Create a new runtime instance with full configuration
	 */
	static createRuntime(ui: UI): RuntimeAPI {
		const runtime = new PromptRuntime(ui);

		// Create the public API object
		const api: RuntimeAPI = {
			executeFlow: runtime.executeFlow.bind(runtime),
			ask: runtime.ask.bind(runtime),
			BACK: runtime.BACK,
			rescanStaticGroupFields:
				runtime.rescanStaticGroupFields.bind(runtime),
			executeGroupBody: runtime.executeGroupBody.bind(runtime),
			// Expose plugin prompts dynamically (including group plugin)
			...runtime.getPluginPrompts(),
		};

		// Set the API object as the current runtime so plugins can access it
		setCurrentRuntime(api);

		return api;
	}

	/**
	 * Create a runtime with custom configuration options
	 */
	static createRuntimeWithOptions(
		ui: UI,
		options?: {
			autoRegister?: boolean;
		}
	): RuntimeAPI {
		const api = this.createRuntime(ui);

		// Apply custom options
		if (options?.autoRegister === false) {
			// Skip automatic registration if explicitly disabled
			// Note: This would require additional implementation
		}

		return api;
	}
}
