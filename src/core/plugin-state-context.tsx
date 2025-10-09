import React, { ReactNode, useSyncExternalStore, useRef } from "react";
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
 * Automatically handles caching and comparison to prevent infinite loops.
 * Plugin developers don't need to implement their own caching!
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
	// Use ref to persist cache across renders
	const cacheRef = useRef<{ value: T; json: string } | null>(null);

	const getSnapshotWithCache = () => {
		const newValue = getSnapshot();

		// Deep comparison using JSON (works for most data types)
		// Only return new instance if data actually changed
		try {
			// Custom serializer to handle Maps, Sets, and other non-JSON types
			const serialize = (obj: any): string => {
				if (obj instanceof Map) {
					// Convert Map to array of entries for proper serialization
					return JSON.stringify(Array.from(obj.entries()));
				} else if (obj instanceof Set) {
					// Convert Set to array for proper serialization
					return JSON.stringify(Array.from(obj));
				} else {
					return JSON.stringify(obj);
				}
			};

			const newJson = serialize(newValue);

			// If cache exists and data hasn't changed, return cached instance
			if (cacheRef.current && cacheRef.current.json === newJson) {
				return cacheRef.current.value;
			}

			// Data changed (or no cache) - cache new value
			cacheRef.current = { value: newValue, json: newJson };
			return newValue;
		} catch (e) {
			// If serialization fails (circular refs, etc), always return new value
			// This may cause extra re-renders but won't break
			return newValue;
		}
	};

	return useSyncExternalStore(
		promptStateManager.subscribe,
		getSnapshotWithCache,
		getSnapshotWithCache
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
