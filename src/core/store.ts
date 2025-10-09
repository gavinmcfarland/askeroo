import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

type Listener = () => void;

/**
 * Store interface for managing state outside React components.
 *
 * Provides a simple API for creating, updating, and subscribing to state.
 */
export interface Store<T> {
	/** Get current state snapshot */
	get(): T;

	/** Update state and notify subscribers */
	update(updater: (state: T) => void): void;

	/** Set state directly and notify subscribers */
	set(newState: T): void;

	/** React hook to subscribe to this store */
	use(): T;

	/** Subscribe manually (advanced) */
	subscribe(listener: () => void): () => void;

	/** Reset to initial state */
	reset(): void;
}

/**
 * Create a typed store for managing state outside React components.
 *
 * This provides a simpler alternative to using useExternalState + notifyExternalStateChange.
 * The store automatically handles notifications when state changes.
 *
 * @example
 * // 1. Create a typed store (one line!)
 * export const taskStore = createStore({
 *   tasks: [] as Task[],
 *   activeTaskId: null as string | null,
 * });
 *
 * // 2. Update anywhere - notifications are automatic!
 * export function addTask(task: Task) {
 *   taskStore.update(state => {
 *     state.tasks.push(task);
 *   });
 *   // No manual notify call needed! ✨
 * }
 *
 * // 3. Use in components - clean and simple
 * export const TasksDisplay = ({ node, options, events }) => {
 *   const { tasks, activeTaskId } = taskStore.use();
 *   // Automatically subscribes and re-renders on changes!
 *
 *   return <Box>{tasks.map(...)}</Box>;
 * };
 *
 * @param initialState - The initial state for the store
 * @returns A Store instance with get, update, set, use, subscribe, and reset methods
 */
export function createStore<T extends Record<string, any>>(
	initialState: T
): Store<T> {
	let state = { ...initialState };
	const listeners = new Set<Listener>();
	const initialStateSnapshot = { ...initialState };

	const notify = () => {
		flushSync(() => {
			listeners.forEach((cb) => cb());
		});
	};

	return {
		get: () => state,

		update: (updater) => {
			updater(state);
			// Create a new object reference so React detects the change
			state = { ...state };
			notify();
		},

		set: (newState) => {
			state = newState;
			notify();
		},

		use: () => {
			return useSyncExternalStore(
				(callback) => {
					listeners.add(callback);
					return () => listeners.delete(callback);
				},
				() => state,
				() => state
			);
		},

		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},

		reset: () => {
			state = { ...initialStateSnapshot };
			notify();
		},
	};
}
