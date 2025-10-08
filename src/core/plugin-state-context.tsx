import React, { createContext, useContext, useState, ReactNode } from "react";
import { flushSync } from "react-dom";

/**
 * Generic Prompt State Context
 *
 * This context provides a reactive state system that ANY prompt can use
 * to trigger UI updates when external state changes.
 *
 * Usage in prompts:
 *
 * @example
 * // In your prompt component
 * import { usePromptState } from '../core/plugin-state-context';
 *
 * export const MyPrompt = ({ node, options, events }) => {
 *     const { revision } = usePromptState();
 *
 *     useEffect(() => {
 *         // Refresh state when revision changes
 *         setMyState(getMyExternalState());
 *     }, [revision]);
 * };
 *
 * // In your prompt's store/service
 * import { getPromptStateNotifier } from '../core/plugin-state-context';
 *
 * export function updateExternalState(data: any) {
 *     // Update your state
 *     globalState.data = data;
 *
 *     // Notify React to re-render subscribed prompts
 *     const notifyChange = getPromptStateNotifier();
 *     if (notifyChange) {
 *         notifyChange();
 *     }
 * }
 */

interface PromptStateContextValue {
	revision: number;
	notifyChange: () => void;
}

const PromptStateContext = createContext<PromptStateContextValue>({
	revision: 0,
	notifyChange: () => {
		console.warn(
			"PromptStateContext: notifyChange called outside of provider"
		);
	},
});

interface PromptStateProviderProps {
	children: ReactNode;
}

/**
 * Provider component that manages prompt state updates.
 * Should be placed high in the component tree (e.g., in PromptApp or ui.tsx)
 */
export function PromptStateProvider({ children }: PromptStateProviderProps) {
	const [revision, setRevision] = useState(0);

	const notifyChange = () => {
		// Use flushSync to make updates synchronous and prevent visual glitches
		// This follows the same pattern as hint updates in PromptApp
		flushSync(() => {
			setRevision((prev) => prev + 1);
		});
	};

	return (
		<PromptStateContext.Provider value={{ revision, notifyChange }}>
			{children}
		</PromptStateContext.Provider>
	);
}

/**
 * Hook for prompts to subscribe to state changes.
 * Returns the current revision number - when it changes, your prompt should re-render.
 *
 * @example
 * const { revision } = usePromptState();
 *
 * useEffect(() => {
 *     // Update local state when revision changes
 *     setMyState(getMyExternalState());
 * }, [revision]);
 */
export function usePromptState() {
	return useContext(PromptStateContext);
}

/**
 * Get the notifyChange function to use in prompt stores/services.
 * This is a convenience function for non-React code that needs to trigger updates.
 *
 * Note: This only works after the provider is mounted. For robustness,
 * always check if the return value exists before calling.
 *
 * @example
 * const notifyChange = getPromptStateNotifier();
 * if (notifyChange) {
 *     notifyChange();
 * }
 */
let globalNotifier: (() => void) | null = null;

export function getPromptStateNotifier(): (() => void) | null {
	return globalNotifier;
}

export function setPromptStateNotifier(notifier: (() => void) | null) {
	globalNotifier = notifier;
}
