/**
 * FlowController - Manages flow control state for prompt execution
 *
 * This class handles the orchestration state needed for running prompt flows:
 * - Step tracking (which step we're on in the flow)
 * - Prompt tracking (list of interactive prompts encountered)
 * - Replay state (whether we're replaying or asking new prompts)
 * - Group processing state (tracking which groups have been shown)
 *
 * Extracted from RuntimeState to separate data storage (tree) from flow control.
 */

export class FlowController {
	// Step tracking
	private currentStep = 0;

	// Prompt tracking
	private interactivePrompts: string[] = [];

	// Flow state
	private asking = false;

	// Group processing
	private processedGroups: Set<string> = new Set();

	constructor() {
		// Empty constructor - all state initialized above
	}

	// ========== STEP TRACKING ==========

	getCurrentStep(): number {
		return this.currentStep;
	}

	incrementStep(): number {
		this.currentStep++;
		return this.currentStep;
	}

	decrementStep(): number {
		if (this.currentStep > 0) {
			this.currentStep--;
		}
		return this.currentStep;
	}

	setStep(step: number): void {
		this.currentStep = Math.max(0, step);
	}

	// ========== PROMPT TRACKING ==========

	addPrompt(id: string): void {
		this.interactivePrompts.push(id);
	}

	getPrompts(): string[] {
		return [...this.interactivePrompts];
	}

	getCurrentPromptIndex(): number {
		return this.interactivePrompts.length;
	}

	getPromptCount(): number {
		return this.interactivePrompts.length;
	}

	clearPrompts(): void {
		this.interactivePrompts = [];
	}

	// ========== ASKING STATE ==========

	isAsking(): boolean {
		return this.asking;
	}

	setAsking(asking: boolean): void {
		this.asking = asking;
	}

	// ========== REPLAY STATE ==========

	isReplaying(): boolean {
		return this.currentStep > 0;
	}

	// ========== GROUP PROCESSING ==========

	markGroupAsProcessed(groupId: string): void {
		this.processedGroups.add(groupId);
	}

	isGroupProcessed(groupId: string): boolean {
		return this.processedGroups.has(groupId);
	}

	clearProcessedGroups(): void {
		this.processedGroups.clear();
	}

	// ========== RESET ==========

	resetForReplay(): void {
		// Clear tracking for new replay cycle
		// Keep currentStep and asking state intact
		this.interactivePrompts = [];
		this.processedGroups.clear();
	}

	reset(): void {
		// Complete reset of all state
		this.currentStep = 0;
		this.interactivePrompts = [];
		this.asking = false;
		this.processedGroups.clear();
	}

	// ========== DEBUG/INSPECTION ==========

	getSnapshot() {
		return {
			promptCount: this.interactivePrompts.length,
			currentStep: this.currentStep,
			asking: this.asking,
			isReplaying: this.isReplaying(),
			processedGroupsCount: this.processedGroups.size,
		};
	}
}
