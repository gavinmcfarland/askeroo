/**
 * RuntimeContext - Manages global runtime instance and lifecycle
 *
 * Provides centralized state management for the current runtime instance,
 * with proper lifecycle management and error handling.
 */

export interface RuntimeAPI {
	executeFlow: Function;
	ask: Function;
	BACK: any;
	rescanStaticGroupFields: Function;
	executeGroupBody: Function; // For group plugin
	handleCtrlC: Function; // For cancel handling
	registerCancelCallback: Function; // For registering cancel callbacks
	[key: string]: any; // For plugin prompts (including group)
}

class RuntimeContextManager {
	private currentRuntime: RuntimeAPI | null = null;

	/**
	 * Set the current runtime instance
	 */
	setCurrentRuntime(runtime: RuntimeAPI): void {
		this.currentRuntime = runtime;
	}

	/**
	 * Get the current runtime instance
	 * Throws error if no runtime is available
	 */
	getCurrentRuntime(): RuntimeAPI {
		if (!this.currentRuntime) {
			throw new Error(
				"No runtime available. Make sure you're calling this from within a runtime context."
			);
		}
		return this.currentRuntime;
	}

	/**
	 * Check if a runtime is currently set
	 */
	hasRuntime(): boolean {
		return this.currentRuntime !== null;
	}

	/**
	 * Clear the current runtime instance
	 */
	clearRuntime(): void {
		this.currentRuntime = null;
	}

	/**
	 * Get runtime for plugin access with type checking
	 */
	getPluginRuntime(pluginType: string): RuntimeAPI {
		const runtime = this.getCurrentRuntime();

		if (!runtime[pluginType]) {
			throw new Error(
				`Plugin "${pluginType}" is not available in the current runtime.`
			);
		}

		return runtime;
	}
}

// Global singleton instance
export const runtimeContext = new RuntimeContextManager();

// Convenience functions
export function setCurrentRuntime(runtime: RuntimeAPI): void {
	runtimeContext.setCurrentRuntime(runtime);
}

export function getCurrentRuntime(): RuntimeAPI {
	return runtimeContext.getCurrentRuntime();
}

export function hasRuntime(): boolean {
	return runtimeContext.hasRuntime();
}

export function clearRuntime(): void {
	runtimeContext.clearRuntime();
}

export function getPluginRuntime(pluginType: string): RuntimeAPI {
	return runtimeContext.getPluginRuntime(pluginType);
}
