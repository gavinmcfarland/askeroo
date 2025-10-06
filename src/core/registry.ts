import * as React from "react";
import {
	PromptPlugin,
	PluginOptionsWithBuiltins,
	PluginComponentProps,
} from "../types/index.js";

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

	shouldAutoSubmit(type: string): boolean {
		const plugin = this.plugins.get(type);
		return plugin?.autoSubmit === true; // Default to false if not specified
	}

	isContainer(type: string): boolean {
		const plugin = this.plugins.get(type);
		return plugin?.isContainer === true;
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
import { getCurrentRuntime, getPluginRuntime } from "./runtime-context.js";

// Plugin creation function that auto-registers
export function createPrompt<T = any, R = any>(config: {
	type: string;
	component?:
		| React.ComponentType<PluginComponentProps<T, R>>
		| ((props: any) => React.ReactElement | null);
	transform?: (opts: T, context: { currentGroup?: string }, id: string) => T; // Optional: transform options before rendering
	autoSubmit?: boolean;
	// Container plugin support
	isContainer?: boolean;
	execute?: (runtime: any, opts: T, body?: () => Promise<any>) => Promise<R>;
	onEnter?: (runtime: any, opts: T) => Promise<void> | void;
	onExit?: (runtime: any, opts: T) => Promise<void> | void;
}): (opts?: PluginOptionsWithBuiltins<T, R>) => Promise<R> {
	// Validate that either component or execute is provided (not required for containers with execute)
	if (!config.component && !config.execute) {
		throw new Error(
			`Plugin "${config.type}" must provide either a component or execute function`
		);
	}

	// Use component directly
	const component = config.component;

	const plugin: PromptPlugin = {
		type: config.type,
		component: component,
		transform: config.transform,
		autoSubmit: config.autoSubmit,
		isContainer: config.isContainer,
		execute: config.execute,
		onEnter: config.onEnter,
		onExit: config.onExit,
	};

	// Auto-register the plugin
	globalRegistry.register(plugin);

	// Return the prompt function that users will call
	// Make opts optional with empty object as default
	return async function (
		opts: PluginOptionsWithBuiltins<T, R> = {} as PluginOptionsWithBuiltins<
			T,
			R
		>
	): Promise<R> {
		const runtime = getPluginRuntime(config.type);

		// For container plugins with custom execute, call it directly
		if (config.isContainer && config.execute) {
			const body = (opts as any).body; // Extract body function for containers
			return await config.execute(runtime, opts, body);
		}

		// Call the dynamically created prompt function from the runtime
		const dynamicPrompt = runtime[config.type];
		return dynamicPrompt(opts);
	};
}
