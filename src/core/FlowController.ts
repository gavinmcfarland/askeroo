/**
 * FlowController - Handles prompt flow control logic
 *
 * This class extracts the flow control responsibilities from RuntimeState,
 * focusing on step tracking, replay state, and flow orchestration.
 * Data storage is handled by the tree.
 */

export class FlowController {
	// Current step in the flow (0-based index)
	private currentStep = 0;

	// List of interactive prompt IDs in current flow
	private interactivePrompts: string[] = [];

	// Whether we're currently in an ask() call
	private asking = false;

	// Track which groups were already processed (to avoid duplicate rendering)
	private lastProcessedGroups: Set<string> = new Set();

	// ========== STEP MANAGEMENT ==========

	/**
	 * Get current step
	 */
	getCurrentStep(): number {
		return this.currentStep;
	}

	/**
	 * Increment current step
	 */
	incrementStep(): number {
		this.currentStep++;
		return this.currentStep;
	}

	/**
	 * Decrement current step (for back navigation)
	 */
	decrementStep(): number {
		if (this.currentStep > 0) {
			this.currentStep--;
		}
		return this.currentStep;
	}

	/**
	 * Set current step to a specific value
	 */
	setStep(step: number): void {
		this.currentStep = Math.max(0, step);
	}

	// ========== PROMPTS MANAGEMENT ==========

	/**
	 * Add a prompt to the interactive prompts list
	 */
	addPrompt(id: string): void {
		this.interactivePrompts.push(id);
	}

	/**
	 * Get the list of interactive prompts
	 */
	getPrompts(): string[] {
		return [...this.interactivePrompts];
	}

	/**
	 * Get the current prompt index (same as step index)
	 */
	getCurrentPromptIndex(): number {
		return this.interactivePrompts.length;
	}

	/**
	 * Get total number of prompts
	 */
	getPromptCount(): number {
		return this.interactivePrompts.length;
	}

	/**
	 * Clear all prompts (used when starting new replay)
	 */
	clearPrompts(): void {
		this.interactivePrompts = [];
	}

	// ========== ASKING STATE ==========

	/**
	 * Set asking state
	 */
	setAsking(asking: boolean): void {
		this.asking = asking;
	}

	/**
	 * Check if currently asking
	 */
	isAsking(): boolean {
		return this.asking;
	}

	// ========== REPLAY STATE ==========

	/**
	 * Check if we're currently replaying (currentStep > 0)
	 */
	isReplaying(): boolean {
		return this.currentStep > 0;
	}

	// ========== PROCESSED GROUPS ==========

	/**
	 * Mark a group as processed
	 */
	markGroupAsProcessed(groupId: string): void {
		this.lastProcessedGroups.add(groupId);
	}

	/**
	 * Check if a group has been processed
	 */
	isGroupProcessed(groupId: string): boolean {
		return this.lastProcessedGroups.has(groupId);
	}

	/**
	 * Clear processed groups (used when starting new replay)
	 */
	clearProcessedGroups(): void {
		this.lastProcessedGroups.clear();
	}

	// ========== FULL RESET ==========

	/**
	 * Reset state for a new replay cycle
	 * Clears prompts, groups, and processed groups tracking
	 * Keeps currentStep intact
	 */
	resetForReplay(): void {
		this.interactivePrompts = [];
		this.lastProcessedGroups.clear();
	}

	/**
	 * Complete reset of all state
	 * Use with caution - typically only needed when creating a fresh runtime
	 */
	reset(): void {
		this.interactivePrompts = [];
		this.currentStep = 0;
		this.asking = false;
		this.lastProcessedGroups.clear();
	}

	// ========== DEBUG/INSPECTION ==========

	/**
	 * Get a snapshot of current state for debugging
	 */
	getSnapshot() {
		return {
			promptCount: this.interactivePrompts.length,
			currentStep: this.currentStep,
			asking: this.asking,
			isReplaying: this.isReplaying(),
			processedGroupsCount: this.lastProcessedGroups.size,
		};
	}
}
