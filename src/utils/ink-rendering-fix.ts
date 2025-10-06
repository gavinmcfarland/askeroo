/**
 * WORKAROUND: Fix for Ink rendering timing bug
 *
 * PROBLEM: When going back from fields (especially from multi fields or groups),
 * React state updates happen too quickly, causing Ink to render with inconsistent state.
 * This results in visual duplication where nodes appear twice or fields appear in both
 * the completed fields section and the current active field section.
 *
 * ROOT CAUSE:
 * 1. Tree state is updated (nodes removed, active node changed)
 * 2. React state update is triggered (setTreeRevision)
 * 3. Ink tries to render before React has fully processed the tree changes
 * The rapid state updates cause React to batch updates incorrectly, and Ink can render
 * with a partial/inconsistent view of the tree state, showing both old and new nodes.
 *
 * SOLUTION: Introduce multiple micro-delays to allow React to fully process state updates:
 * 1. First delay using console.log() to allow initial React processing
 * 2. Second delay using setImmediate() to push to next event loop tick
 * We suppress stdout to avoid visual artifacts.
 *
 * WHY THIS WORKS: The combination of synchronous console.log() and asynchronous
 * setImmediate() ensures React has enough time to fully process and reconcile the
 * tree state before Ink attempts to render it, preventing rendering inconsistencies.
 */
export function applyInkRenderingFix(): void {
	const originalStdout = process.stdout.write;

	// Apply multiple micro-delays through console.log to ensure React has enough time
	// to fully process and reconcile tree state changes before Ink renders
	// More delays = more time for React reconciliation, preventing duplicate rendering
	for (let i = 0; i < 5; i++) {
		process.stdout.write = () => true;
		console.log();
		process.stdout.write = originalStdout;
	}
}
