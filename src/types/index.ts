// Centralized type definitions for the Askeroo library
// This eliminates duplicate type definitions across multiple files

import * as React from "react";
import type { GroupOpts } from "../built-ins/group/index.js";

// Re-export group types
export type { GroupOpts };

// Core runtime types
export type Answers = Record<string, unknown>;
export type PromptKind = string;
export type BackToken = { __back: true };

// Prompt request type - used across multiple files
export type PromptRequest = {
	type: string;
	id: string;
	label?: string;
	groupName?: string;
	flow?: "progressive" | "phased" | "static";
	discoveredFields?: Array<{ id: string; label: string; type: string }>;
	enableArrowNavigation?: boolean;
	excludeFromCompleted?: boolean;
	hideOnCompletion?: boolean;
	allowBack?: boolean;
	depth?: number;
	[key: string]: any; // Allow any additional properties for plugin-specific options
};

// Group-related types (kept for backward compatibility with FlowFunction type)
export type GroupMeta = { label?: string; id?: string };

// Prompt options type
export type PromptOpts = { message: string; id?: string };

// UI interface type
export type UI = {
	showGroup(
		label: string | undefined,
		flow?: "progressive" | "phased" | "static",
		id?: string,
		discoveredFields?: Array<{ id: string; label: string; type: string }>,
		enableArrowNavigation?: boolean,
		depth?: number,
		parentGroup?: string,
		groupOptions?: any
	): Promise<void> | void;
	clearGroup?(): void;
	cleanup?(): void;
	// Dynamic UI handlers from plugins
	[key: string]: any;
};

// Engine interface type
export type Engine = {
	step<T>(
		kind: PromptKind,
		opts: PromptOpts | (GroupMeta & GroupOpts),
		askFn: (id: string) => Promise<T | BackToken>
	): Promise<T>;
	BACK: BackToken;
};

// State management types (for tree adapter)
export interface FieldState {
	values: Record<string, any>;
	visited: Set<string>;
	completed: Set<string>;
	properties: Map<string, any>;
	messages: Record<string, string>;
	groupNames: Record<string, string>;
	groupIds: Record<string, string>;
}

export interface GroupState {
	progressive: Set<string>;
	phased: Set<string>;
	static: Set<string>;
	completed: Set<string>;
	order: string[];
	arrowNavigation: Set<string>;
	depths: Map<string, number>;
}

export interface PromptOrderState {
	root: Array<{ id: string; type: "field" | "group"; groupName?: string }>;
	rootFieldHistory: Array<{
		id: string;
		label: string;
		type: string;
		hideOnCompletion?: boolean;
	}>;
	staticGroupFields: Map<
		string,
		Array<{
			id: string;
			label: string;
			type: string;
			hideOnCompletion?: boolean;
		}>
	>;
	groupFieldHistory: Map<
		string,
		Array<{
			id: string;
			label: string;
			type: string;
			hideOnCompletion?: boolean;
		}>
	>;
}

// Plugin registry types
export type PluginRenderProps = {
	value?: any;
	initialValue?: any;
	completedValue?: any;
	state: PluginState;
	message?: string;
	label?: string;
	onSubmit: (value: any) => void;
	onBack?: () => void;
	flow?: "progressive" | "phased" | "static";
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	isFirstRootPrompt?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	allowBack?: boolean;
	[key: string]: any; // Allow any additional plugin-specific props
};

export type PromptPlugin = {
	type: string;
	component?:
		| React.ComponentType<any>
		| ((props: any) => React.ReactElement | null); // Plugin component or render function
	transform?: (
		opts: any,
		context: { currentGroup?: string },
		id: string
	) => any; // Optional: transform options before rendering (defaults to identity function)
	autoSubmit?: boolean; // Whether this prompt auto-submits without user interaction (default: false)

	// Container plugin support (for groups and similar structural elements)
	isContainer?: boolean; // True if this plugin is a container that can hold other prompts
	onEnter?: (runtime: any, opts: any) => Promise<void> | void; // Called when entering the container
	onExit?: (runtime: any, opts: any) => Promise<void> | void; // Called when exiting the container
	execute?: (
		runtime: any,
		opts: any,
		body: () => Promise<any>
	) => Promise<any>; // Custom execution logic for containers
};

// Flow function type
export type FlowFunction<T> = (
	api: {
		BACK: BackToken;
	} & Record<string, any> // All plugins (including group) are dynamically added here
) => Promise<T>;

// Validation function type - return string for error, null for valid
export type ValidatorFunction<T = any> = (
	value: T
) => string | null | Promise<string | null>;

// Plugin state type - unified state for all plugins
export type PluginState = "active" | "completed" | "disabled";

// ============================================================================
// Plugin Component Props Types (New Structured API)
// ============================================================================

/**
 * Node properties - library-managed flow state
 * These are shared across all plugins and managed by the framework
 */
export interface PluginNode {
	state: PluginState;
	flow?: "progressive" | "phased" | "static";
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	isFirstRootPrompt?: boolean;
	allowBack?: boolean;
	completedValue?: any;
	enableArrowNavigation?: boolean;
	depth?: number;
	children?: React.ReactNode;
}

/**
 * Base event handlers available to all plugins
 * Generic type T is the value type the plugin submits
 */
export interface PluginEvents<T = any> {
	onSubmit?: (value: T | any) => void; // Allow any for special navigation objects
	onBack?: () => void;
	onHintChange?: (hint: React.ReactNode) => void;
	onValidate?: ValidatorFunction<T>;
	onNavigate?: (direction: "up" | "down") => void;
	[key: string]: any; // Allow plugin-specific events
}

/**
 * Helper type for plugin component props
 * Combines node, user options, and events into structured format
 *
 * @template TOptions - User-provided plugin options
 * @template TValue - The value type the plugin submits
 */
export interface PluginComponentProps<TOptions = any, TValue = any> {
	node: PluginNode;
	options: TOptions;
	events: PluginEvents<TValue>;
}

/**
 * Helper type that combines user options with built-in properties
 * This is what the plugin function accepts (e.g., text({ label: "...", allowBack: false }))
 *
 * @template TOptions - User-provided plugin options
 * @template TValue - The value type the plugin submits
 */
export type PluginOptionsWithBuiltins<
	TOptions = any,
	TValue = any
> = TOptions & {
	// Node built-ins (can be provided by user)
	id?: string;
	excludeFromCompleted?: boolean;
	hideOnCompletion?: boolean;
	allowBack?: boolean;
	// Event handlers (can be provided by user)
	onValidate?: ValidatorFunction<TValue>;
	// Meta
	meta?: Record<string, any>;
};
