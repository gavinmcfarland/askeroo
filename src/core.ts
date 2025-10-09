/**
 * Core utilities for creating custom prompts
 *
 * Import from: askeroo/core
 *
 * @example
 * import { createPrompt, usePromptState, getPromptStateNotifier } from "askeroo/core";
 */

// Prompt creation and registration
export {
	createPrompt,
	registerPlugin,
	globalRegistry,
	type PromptPlugin,
} from "./core/registry.js";

// Prompt State Context system for reactive updates
export {
	usePromptData,
	notifyPromptStateChange,
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
