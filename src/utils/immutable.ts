/**
 * Utility functions for immutable Set and Map updates
 */

// Set utilities
export const addToSet = <T>(set: Set<T>, item: T): Set<T> => {
	if (set.has(item)) return set;
	return new Set(set).add(item);
};

export const removeFromSet = <T>(set: Set<T>, item: T): Set<T> => {
	if (!set.has(item)) return set;
	const newSet = new Set(set);
	newSet.delete(item);
	return newSet;
};

export const toggleInSet = <T>(set: Set<T>, item: T): Set<T> => {
	return set.has(item) ? removeFromSet(set, item) : addToSet(set, item);
};

// Map utilities
export const setInMap = <K, V>(map: Map<K, V>, key: K, value: V): Map<K, V> => {
	const existingValue = map.get(key);
	if (existingValue === value) return map;

	const newMap = new Map(map);
	newMap.set(key, value);
	return newMap;
};

export const updateInMap = <K, V>(
	map: Map<K, V>,
	key: K,
	updater: (existing: V | undefined) => V
): Map<K, V> => {
	const existingValue = map.get(key);
	const newValue = updater(existingValue);

	if (existingValue === newValue) return map;

	const newMap = new Map(map);
	newMap.set(key, newValue);
	return newMap;
};

export const removeFromMap = <K, V>(map: Map<K, V>, key: K): Map<K, V> => {
	if (!map.has(key)) return map;
	const newMap = new Map(map);
	newMap.delete(key);
	return newMap;
};