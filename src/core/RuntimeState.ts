/**
 * RuntimeState - Manages all runtime state for the prompt flow
 *
 * This class encapsulates the state management logic, making it easier to test,
 * debug, and reason about. It tracks user answers, navigation state, group context,
 * and provides clean methods for state manipulation.
 */

import { Answers } from "../types/index.js";

export class RuntimeState {
	// User answers for each prompt
	private answers: Map<string, any> = new Map();

	// List of interactive prompt IDs in current flow
	private interactivePrompts: string[] = [];

	// Current step in the flow (0-based index)
	private currentStep = 0;

	// Whether we're currently in an ask() call
	private asking = false;

	// Track current group nesting during flow execution
	// Note: groupStack is necessary during flow execution, before nodes are added to tree
	private groupStack: string[] = [];

	// Track which groups were already processed (to avoid duplicate rendering)
	private lastProcessedGroups: Set<string> = new Set();

	// ========== ANSWERS MANAGEMENT ==========

	/**
	 * Add or update an answer for a prompt
	 */
	addAnswer(id: string, value: any): void {
		this.answers.set(id, value);
	}

	/**
	 * Get an answer for a prompt
	 */
	getAnswer(id: string): any | undefined {
		return this.answers.get(id);
	}

	/**
	 * Check if we have an answer for a prompt
	 */
	hasAnswer(id: string): boolean {
		return this.answers.has(id);
	}

	/**
	 * Get all answers as a plain object
	 */
	getAllAnswers(): Answers {
		return Object.fromEntries(this.answers);
	}

	/**
	 * Get answer count
	 */
	getAnswerCount(): number {
		return this.answers.size;
	}

	/**
	 * Delete an answer
	 */
	deleteAnswer(id: string): void {
		this.answers.delete(id);
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

	// ========== GROUP STACK MANAGEMENT ==========

	/**
	 * Push a group ID onto the stack
	 */
	pushGroup(groupId: string): void {
		this.groupStack.push(groupId);
	}

	/**
	 * Pop a group ID from the stack
	 */
	popGroup(): string | undefined {
		return this.groupStack.pop();
	}

	/**
	 * Get the current group (top of stack)
	 */
	getCurrentGroup(): string | undefined {
		return this.groupStack[this.groupStack.length - 1];
	}

	/**
	 * Get the full group stack
	 */
	getGroupStack(): string[] {
		return [...this.groupStack];
	}

	/**
	 * Get the depth of the current group nesting
	 */
	getGroupDepth(): number {
		return this.groupStack.length;
	}

	/**
	 * Clear the group stack
	 */
	clearGroupStack(): void {
		this.groupStack = [];
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

	// ========== NAVIGATION HELPERS ==========

	/**
	 * Clear all answers that come after the current step
	 * Used for back navigation to remove future answers
	 */
	clearFutureAnswers(): void {
		const currentPrompts = new Set(
			this.interactivePrompts.slice(0, this.currentStep)
		);
		const answerIds = Array.from(this.answers.keys());

		for (const id of answerIds) {
			if (!currentPrompts.has(id)) {
				this.answers.delete(id);
			}
		}
	}

	/**
	 * Clear answers not in the reachable prompts list
	 * Used after replay to clean up unreachable answers
	 */
	clearUnreachableAnswers(): void {
		const reachablePrompts = new Set(this.interactivePrompts);
		const answerIds = Array.from(this.answers.keys());

		for (const id of answerIds) {
			if (!reachablePrompts.has(id)) {
				this.answers.delete(id);
			}
		}
	}

	// ========== FULL RESET ==========

	/**
	 * Reset state for a new replay cycle
	 * Clears prompts, groups, and processed groups tracking
	 * Keeps answers and currentStep intact
	 */
	resetForReplay(): void {
		this.interactivePrompts = [];
		this.groupStack = [];
		this.lastProcessedGroups.clear();
	}

	/**
	 * Complete reset of all state
	 * Use with caution - typically only needed when creating a fresh runtime
	 */
	reset(): void {
		this.answers.clear();
		this.interactivePrompts = [];
		this.currentStep = 0;
		this.asking = false;
		this.groupStack = [];
		this.lastProcessedGroups.clear();
	}

	// ========== DEBUG/INSPECTION ==========

	/**
	 * Get a snapshot of current state for debugging
	 */
	getSnapshot() {
		return {
			answerCount: this.answers.size,
			promptCount: this.interactivePrompts.length,
			currentStep: this.currentStep,
			asking: this.asking,
			isReplaying: this.isReplaying(),
			groupDepth: this.groupStack.length,
			currentGroup: this.getCurrentGroup(),
			processedGroupsCount: this.lastProcessedGroups.size,
		};
	}
}
