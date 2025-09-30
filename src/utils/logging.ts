/**
 * Utility function for consistent result logging across examples
 */
export const logResult = (result: any, label = "Result") => {
	console.log(`\n${label}:`, JSON.stringify(result, null, 2));
};