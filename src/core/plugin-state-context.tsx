import React, { createContext, useContext, useState, ReactNode } from "react";
import { flushSync } from "react-dom";

/**
 * Generic Plugin State Context
 *
 * This context provides a reactive state system that ANY plugin can use
 * to trigger UI updates when external state changes.
 *
 * Usage in plugins:
 *
 * @example
 * // In your plugin component
 * import { usePluginState } from '../core/plugin-state-context';
 *
 * export const MyPlugin = ({ node, options, events }) => {
 *     const { revision } = usePluginState();
 *
 *     useEffect(() => {
 *         // Refresh state when revision changes
 *         setMyState(getMyExternalState());
 *     }, [revision]);
 * };
 *
 * // In your plugin's store/service
 * import { getPluginStateNotifier } from '../core/plugin-state-context';
 *
 * export function updateExternalState(data: any) {
 *     // Update your state
 *     globalState.data = data;
 *
 *     // Notify React to re-render subscribed plugins
 *     const notifyChange = getPluginStateNotifier();
 *     if (notifyChange) {
 *         notifyChange();
 *     }
 * }
 */

interface PluginStateContextValue {
	revision: number;
	notifyChange: () => void;
}

const PluginStateContext = createContext<PluginStateContextValue>({
	revision: 0,
	notifyChange: () => {
		console.warn(
			"PluginStateContext: notifyChange called outside of provider"
		);
	},
});

interface PluginStateProviderProps {
	children: ReactNode;
}

/**
 * Provider component that manages plugin state updates.
 * Should be placed high in the component tree (e.g., in PromptApp or ui.tsx)
 */
export function PluginStateProvider({ children }: PluginStateProviderProps) {
	const [revision, setRevision] = useState(0);

	const notifyChange = () => {
		// Use flushSync to make updates synchronous and prevent visual glitches
		// This follows the same pattern as hint updates in PromptApp
		flushSync(() => {
			setRevision((prev) => prev + 1);
		});
	};

	return (
		<PluginStateContext.Provider value={{ revision, notifyChange }}>
			{children}
		</PluginStateContext.Provider>
	);
}

/**
 * Hook for plugins to subscribe to state changes.
 * Returns the current revision number - when it changes, your plugin should re-render.
 *
 * @example
 * const { revision } = usePluginState();
 *
 * useEffect(() => {
 *     // Update local state when revision changes
 *     setMyState(getMyExternalState());
 * }, [revision]);
 */
export function usePluginState() {
	return useContext(PluginStateContext);
}

/**
 * Get the notifyChange function to use in plugin stores/services.
 * This is a convenience function for non-React code that needs to trigger updates.
 *
 * Note: This only works after the provider is mounted. For robustness,
 * always check if the return value exists before calling.
 *
 * @example
 * const notifyChange = getPluginStateNotifier();
 * if (notifyChange) {
 *     notifyChange();
 * }
 */
let globalNotifier: (() => void) | null = null;

export function getPluginStateNotifier(): (() => void) | null {
	return globalNotifier;
}

export function setPluginStateNotifier(notifier: (() => void) | null) {
	globalNotifier = notifier;
}
