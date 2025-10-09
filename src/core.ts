/**
 * Core utilities for creating custom prompts
 *
 * Import from: askeroo/core
 *
 * @example
 * // Modern approach with store factory
 * import { createPrompt, createStore } from "askeroo/core";
 *
 * // Or manual state management
 * import { createPrompt, useExternalState, notifyExternalStateChange } from "askeroo/core";
 */

// Prompt creation and registration
export {
	createPrompt,
	registerPlugin,
	globalRegistry,
	type PromptPlugin,
} from "./core/registry.js";

// Store factory for external state management
export { createStore, type Store } from "./core/store.js";

// Prompt State Context system for reactive updates
export {
	useExternalState,
	notifyExternalStateChange,
	PromptStateProvider,
	// Legacy compatibility
	usePromptState,
	getPromptStateNotifier,
	setPromptStateNotifier,
} from "./core/plugin-state-context.js";

// Runtime creation (advanced)
export { createRuntime } from "./core/core.js";

// Type definitions
export type { PluginComponentProps } from "./types/index.js";
