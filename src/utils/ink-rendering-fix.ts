/**
 * WORKAROUND: Fix for Ink rendering timing bug
 *
 * PROBLEM: When going back from fields (especially from multi fields or groups),
 * React state updates happen too quickly, causing Ink to render with inconsistent state.
 * This results in visual duplication where nodes appear twice or fields appear in both
 * the completed fields section and the current active field section.
 *
 * When terminal height is limited, Ink has to redraw the entire screen, which exacerbates
 * the issue and causes the first prompt to be duplicated in the output.
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
	for (let i = 0; i < 10; i++) {
		process.stdout.write = () => true;
		console.log();
		process.stdout.write = originalStdout;
	}
}

/**
 * Async version of the rendering fix that waits for the next event loop tick
 * Use this when you need to ensure complete React reconciliation before proceeding
 */
export async function applyInkRenderingFixAsync(): Promise<void> {
	// First apply the synchronous fix
	applyInkRenderingFix();

	// Then wait for the next event loop tick to ensure all React updates are processed
	await new Promise<void>((resolve) => {
		setImmediate(() => {
			// Wait one more tick to be absolutely sure
			setImmediate(() => {
				resolve();
			});
		});
	});
}

/**
 * Execute a callback while temporarily suppressing stdout to prevent
 * intermediate rendering artifacts during state transitions
 */
export function withOutputSuppression<T>(callback: () => T): T {
	const originalStdoutWrite = process.stdout.write;
	const originalStderrWrite = process.stderr.write;

	try {
		// Temporarily suppress all output
		process.stdout.write = () => true;
		process.stderr.write = () => true;

		// Execute the callback
		const result = callback();

		return result;
	} finally {
		// Restore output after a brief delay to ensure state is settled
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
	}
}
