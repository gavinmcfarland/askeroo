import React, { ReactNode, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

/**
 * Prompt State Manager - Subscription-based state management
 *
 * Provides a simple way for prompts to subscribe to external state changes
 * using React's built-in useSyncExternalStore hook.
 *
 * Usage in prompts:
 *
 * @example
 * // In your prompt component
 * import { usePromptData } from 'askeroo/core';
 *
 * export const MyPrompt = ({ node, options, events }) => {
 *     // Single line - reads data and auto-updates!
 *     const data = usePromptData(() => getMyExternalData());
 *
 *     return <Box>{data.map(...)}</Box>;
 * };
 *
 * // In your prompt's store/service
 * import { notifyPromptStateChange } from 'askeroo/core';
 *
 * export function updateExternalState(data: any) {
 *     // Update your state
 *     globalState.data = data;
 *
 *     // Notify React to re-render subscribed prompts (simple!)
 *     notifyPromptStateChange();
 * }
 */

class PromptStateManager {
	private listeners = new Set<() => void>();

	subscribe = (callback: () => void) => {
		this.listeners.add(callback);
		return () => {
			this.listeners.delete(callback);
		};
	};

	notify = () => {
		// Use flushSync to make updates synchronous and prevent visual glitches
		flushSync(() => {
			this.listeners.forEach((cb) => cb());
		});
	};
}

const promptStateManager = new PromptStateManager();

interface PromptStateProviderProps {
	children: ReactNode;
}

/**
 * Provider component that manages prompt state updates.
 * Should be placed high in the component tree (e.g., in ui.tsx)
 *
 * Note: This provider is required for prompt state management to work.
 */
export function PromptStateProvider({ children }: PromptStateProviderProps) {
	// The provider just wraps children - the manager handles subscriptions
	return <>{children}</>;
}

/**
 * Hook for prompts to read and subscribe to external data.
 *
 * Uses React's useSyncExternalStore for optimal performance and automatic
 * re-rendering when external state changes.
 *
 * @example
 * // Single line - reads data and auto-subscribes!
 * const tasks = usePromptData(() => getTasksFromStore());
 * const fields = usePromptData(() => getCompletedFieldsData());
 *
 * @param getSnapshot - Function that returns the current data
 * @returns The current data, automatically updated when notifyPromptStateChange is called
 */
export function usePromptData<T>(getSnapshot: () => T): T {
	return useSyncExternalStore(
		promptStateManager.subscribe,
		getSnapshot,
		getSnapshot
	);
}

/**
 * Notify all subscribed prompts that state has changed.
 * Call this from stores/services after updating external state.
 *
 * @example
 * export function addTask(task: Task) {
 *     globalStore.tasks.push(task);
 *     notifyPromptStateChange(); // Triggers re-render
 * }
 */
export function notifyPromptStateChange(): void {
	promptStateManager.notify();
}

// Legacy compatibility exports
export function getPromptStateNotifier(): (() => void) | null {
	return notifyPromptStateChange;
}

export function setPromptStateNotifier(_notifier: (() => void) | null) {
	// No-op for backward compatibility
	// The manager handles subscriptions directly now
}

// Legacy hook for backward compatibility
export function usePromptState() {
	// Return a dummy revision that changes when manager notifies
	// This allows old code to still work during migration
	let revision = 0;
	usePromptData(() => {
		revision++;
		return revision;
	});
	return { revision, notifyChange: notifyPromptStateChange };
}
