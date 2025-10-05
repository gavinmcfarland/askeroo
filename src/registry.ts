import { PromptPlugin } from "./types/index.js";

export type { PromptPlugin };

class PromptRegistry {
	private plugins: Map<string, PromptPlugin> = new Map();

	register(plugin: PromptPlugin): void {
		this.plugins.set(plugin.type, plugin);
	}

	get(type: string): PromptPlugin | undefined {
		return this.plugins.get(type);
	}

	getAll(): PromptPlugin[] {
		return Array.from(this.plugins.values());
	}

	getComponent(type: string): React.ComponentType<any> | undefined {
		const plugin = this.plugins.get(type);
		return plugin?.component;
	}

	isInteractive(type: string): boolean {
		const plugin = this.plugins.get(type);
		return plugin?.interactive !== false; // Default to true if not specified
	}

	getComponents(): Record<string, React.ComponentType<any>> {
		const components: Record<string, React.ComponentType<any>> = {};

		for (const [type, plugin] of this.plugins.entries()) {
			if (plugin.component) {
				components[type] = plugin.component;
			}
		}

		return components;
	}
}

// Global singleton registry
export const globalRegistry = new PromptRegistry();

// Manual plugin registration function for external developers
export function registerPlugin(plugin: PromptPlugin): void {
	globalRegistry.register(plugin);
}

// Import runtime context management
import { getCurrentRuntime, getPluginRuntime } from "./core/runtime-context.js";

// Plugin creation function that auto-registers
export function createPlugin<T = any, R = any>(config: {
	type: string;
	component?: React.ComponentType<any>;
	render?: () => React.ComponentType<any>; // Factory function that returns a component
	transform?: (opts: T, context: { currentGroup?: string }, id: string) => T; // Optional: transform options before rendering
	interactive?: boolean;
}): (opts: T) => Promise<R> {
	// Validate that either component or render is provided
	if (!config.component && !config.render) {
		throw new Error(
			`Plugin "${config.type}" must provide either a component or render function`
		);
	}

	// If render is provided, call it to get the component
	const component =
		config.component || (config.render ? config.render() : undefined);

	const plugin: PromptPlugin = {
		type: config.type,
		component: component,
		transform: config.transform,
		interactive: config.interactive,
	};

	// Auto-register the plugin
	globalRegistry.register(plugin);

	// Return the prompt function that users will call
	return async function (opts: T): Promise<R> {
		const runtime = getPluginRuntime(config.type);

		// Call the dynamically created prompt function from the runtime
		const dynamicPrompt = runtime[config.type];
		return dynamicPrompt(opts);
	};
}
