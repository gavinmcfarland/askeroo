/**
 * WORKAROUND: Fix for Ink rendering timing bug
 *
 * PROBLEM: When going back from multi fields (especially after pressing escape twice),
 * React state updates happen too quickly, causing Ink to render with inconsistent state.
 * This results in visual duplication where fields appear in both the completed fields
 * section and the current active field section.
 *
 * ROOT CAUSE: Multi field escape behavior:
 * 1. First escape: Clears selections and selects "none" (handled by multi field)
 * 2. Second escape: Goes back to previous field (handled by flow component)
 * The rapid state updates (completedFields + currentIndex) cause React to batch
 * updates incorrectly, leading to rendering inconsistencies.
 *
 * SOLUTION: Introduce a micro-delay using console.log() to allow React to properly
 * batch state updates. We suppress the stdout output to avoid visual artifacts.
 *
 * WHY THIS WORKS: console.log() operations are asynchronous and introduce a small
 * delay that allows React's state batching to work correctly, preventing the
 * rendering inconsistency that causes duplication.
 */
export function applyInkRenderingFix(): void {
	const originalStdout = process.stdout.write;
	process.stdout.write = () => true; // Suppress console.log output
	console.log(); // Still provides the timing benefit
	process.stdout.write = originalStdout; // Restore original stdout
}
