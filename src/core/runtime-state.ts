/**
 * RuntimeState - Manages all runtime state for the prompt flow
 *
 * Consolidated state management with clear, descriptive method names.
 * Handles answers, navigation, group context, and flow control.
 */

import { Answers } from "../types/index.js";

export class RuntimeState {
	// ===== ANSWER STORAGE =====
	private answers: Map<string, any> = new Map();

	// ===== NAVIGATION STATE =====
	private interactivePrompts: string[] = [];
	private currentPromptIndex = 0;

	// ===== FLOW CONTROL =====
	private isInFlowExecution = false;

	// ===== GROUP CONTEXT =====
	private groupHierarchy: string[] = [];
	private processedGroups: Set<string> = new Set();

	// ========== ANSWER MANAGEMENT ==========

	storeAnswer(promptId: string, value: any): void {
		this.answers.set(promptId, value);
	}

	retrieveAnswer(promptId: string): any | undefined {
		return this.answers.get(promptId);
	}

	hasStoredAnswer(promptId: string): boolean {
		return this.answers.has(promptId);
	}

	getAllAnswers(): Answers {
		return Object.fromEntries(this.answers);
	}

	getAnswerCount(): number {
		return this.answers.size;
	}

	removeAnswer(promptId: string): void {
		this.answers.delete(promptId);
	}

	clearAllAnswers(): void {
		this.answers.clear();
	}

	// ========== PROMPT TRACKING ==========

	registerPrompt(promptId: string): void {
		this.interactivePrompts.push(promptId);
	}

	getPromptHistory(): string[] {
		return [...this.interactivePrompts];
	}

	getTotalPromptCount(): number {
		return this.interactivePrompts.length;
	}

	clearPromptHistory(): void {
		this.interactivePrompts = [];
	}

	// ========== NAVIGATION ==========

	getCurrentPromptIndex(): number {
		return this.currentPromptIndex;
	}

	advanceToNextPrompt(): number {
		this.currentPromptIndex++;
		return this.currentPromptIndex;
	}

	returnToPreviousPrompt(): number {
		if (this.currentPromptIndex > 0) {
			this.currentPromptIndex--;
		}
		return this.currentPromptIndex;
	}

	setPromptIndex(index: number): void {
		this.currentPromptIndex = Math.max(0, index);
	}

	isReplayingAnswers(): boolean {
		return this.currentPromptIndex > 0;
	}

	hasReachedEndOfFlow(): boolean {
		return this.currentPromptIndex >= this.interactivePrompts.length;
	}

	// ========== GROUP MANAGEMENT ==========

	enterGroup(groupId: string): void {
		this.groupHierarchy.push(groupId);
	}

	exitGroup(): string | undefined {
		return this.groupHierarchy.pop();
	}

	getCurrentGroupId(): string | undefined {
		return this.groupHierarchy[this.groupHierarchy.length - 1];
	}

	getGroupHierarchy(): string[] {
		return [...this.groupHierarchy];
	}

	getGroupDepth(): number {
		return this.groupHierarchy.length;
	}

	clearGroupHierarchy(): void {
		this.groupHierarchy = [];
	}

	// ========== PROCESSED GROUPS ==========

	markGroupAsProcessed(groupId: string): void {
		this.processedGroups.add(groupId);
	}

	isGroupProcessed(groupId: string): boolean {
		return this.processedGroups.has(groupId);
	}

	clearProcessedGroups(): void {
		this.processedGroups.clear();
	}

	// ========== FLOW EXECUTION STATE ==========

	beginFlowExecution(): void {
		this.isInFlowExecution = true;
	}

	endFlowExecution(): void {
		this.isInFlowExecution = false;
	}

	isExecutingFlow(): boolean {
		return this.isInFlowExecution;
	}

	// ========== ANSWER CLEANUP ==========

	/**
	 * Remove answers for prompts that come after the current position
	 * Used for back navigation to clear future answers
	 */
	clearAnswersAfterCurrentPosition(): void {
		const currentPrompts = new Set(
			this.interactivePrompts.slice(0, this.currentPromptIndex)
		);
		const answerIds = Array.from(this.answers.keys());

		for (const id of answerIds) {
			if (!currentPrompts.has(id)) {
				this.answers.delete(id);
			}
		}
	}

	/**
	 * Remove answers for prompts that are no longer in the flow
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

	// ========== RESET OPERATIONS ==========

	/**
	 * Reset state for a new replay cycle
	 * Clears prompts, groups, and processed groups tracking
	 * Keeps answers and currentPromptIndex intact
	 */
	prepareForReplay(): void {
		this.interactivePrompts = [];
		this.groupHierarchy = [];
		this.processedGroups.clear();
	}

	/**
	 * Complete reset of all state
	 * Use with caution - typically only needed when creating a fresh runtime
	 */
	resetAll(): void {
		this.answers.clear();
		this.interactivePrompts = [];
		this.currentPromptIndex = 0;
		this.isInFlowExecution = false;
		this.groupHierarchy = [];
		this.processedGroups.clear();
	}

	// ========== DEBUG/INSPECTION ==========

	getDebugInfo() {
		return {
			answerCount: this.answers.size,
			totalPrompts: this.interactivePrompts.length,
			currentIndex: this.currentPromptIndex,
			isExecuting: this.isInFlowExecution,
			isReplaying: this.isReplayingAnswers(),
			groupDepth: this.groupHierarchy.length,
			currentGroup: this.getCurrentGroupId(),
			processedGroupsCount: this.processedGroups.size,
		};
	}
}
