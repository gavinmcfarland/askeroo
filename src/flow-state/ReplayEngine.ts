import { FlowStateManager } from './FlowStateManager.js';
import { FlowStep, FlowFunction } from './types.js';

export class ReplayEngine {
  private isReplaying: boolean = false;
  private replaySteps: FlowStep[] = [];
  private replayIndex: number = 0;
  private pendingPromptResolve: ((value: any) => void) | null = null;

  constructor(private stateManager: FlowStateManager) {}

  // Execute a flow with replay capability
  async executeFlow<T>(flowFn: FlowFunction<T>, fromStepId?: string): Promise<T> {
    if (fromStepId) {
      return this.executeWithReplay(flowFn, fromStepId);
    } else {
      // Regular execution
      return flowFn();
    }
  }

  // Execute flow starting from a specific step
  private async executeWithReplay<T>(flowFn: FlowFunction<T>, fromStepId: string): Promise<T> {
    // Find the target step and restore state
    const allSteps = this.stateManager.getAllSteps();
    const targetStepIndex = allSteps.findIndex(s => s.id === fromStepId);
    if (targetStepIndex === -1) {
      throw new Error(`Step ${fromStepId} not found`);
    }

    // Get all steps up to (but not including) the target step for replay
    // This will replay all previous prompts automatically
    this.replaySteps = allSteps.slice(0, targetStepIndex).filter(step => step.type === 'prompt');
    this.replayIndex = 0;
    this.isReplaying = true;

    try {
      const result = await flowFn();
      this.isReplaying = false;
      return result;
    } catch (error) {
      this.isReplaying = false;
      throw error;
    }
  }

  // Check if currently replaying
  isCurrentlyReplaying(): boolean {
    return this.isReplaying;
  }

  // Get the next replay value for a prompt (if available)
  getReplayValue(promptConfig: any): any {
    if (!this.isReplaying || this.replayIndex >= this.replaySteps.length) {
      return undefined;
    }

    const replayStep = this.replaySteps[this.replayIndex];

    // Check if this replay step matches the current prompt
    if (replayStep.type === 'prompt' && this.configMatches(replayStep.config, promptConfig)) {
      this.replayIndex++;
      return replayStep.value;
    }

    return undefined;
  }

  // Register a prompt resolve function for replay
  registerPromptResolve(resolve: (value: any) => void): void {
    if (this.isReplaying) {
      this.pendingPromptResolve = resolve;

      // Check if we have a replay value available
      setTimeout(() => {
        if (this.pendingPromptResolve && this.replayIndex < this.replaySteps.length) {
          const replayStep = this.replaySteps[this.replayIndex];
          if (replayStep.type === 'prompt') {
            this.replayIndex++;
            this.pendingPromptResolve(replayStep.value);
            this.pendingPromptResolve = null;
          }
        }
      }, 50); // Small delay to allow UI to update
    }
  }

  // Check if two prompt configs match (for replay identification)
  private configMatches(replayConfig: any, currentConfig: any): boolean {
    // Match by name if available
    if (replayConfig.name && currentConfig.name) {
      return replayConfig.name === currentConfig.name;
    }

    // Match by message as fallback
    return replayConfig.message === currentConfig.message;
  }

  // Skip to next prompt that requires user input
  skipToNextUserPrompt(): void {
    while (this.replayIndex < this.replaySteps.length) {
      const step = this.replaySteps[this.replayIndex];
      if (step.type === 'prompt') {
        break; // Stop at the next prompt that needs user input
      }
      this.replayIndex++;
    }
  }

  // Get current replay progress
  getReplayProgress(): { current: number; total: number; isComplete: boolean } {
    return {
      current: this.replayIndex,
      total: this.replaySteps.length,
      isComplete: this.replayIndex >= this.replaySteps.length
    };
  }

  // Reset replay state
  reset(): void {
    this.isReplaying = false;
    this.replaySteps = [];
    this.replayIndex = 0;
    this.pendingPromptResolve = null;
  }

  // Handle conditional replay
  shouldExecuteBranch(conditionId: string, currentResult: boolean): boolean {
    if (!this.isReplaying) {
      return currentResult; // Normal execution
    }

    // Look for this conditional in replay steps
    const conditionalStep = this.replaySteps.find(step =>
      step.type === 'conditional' && step.conditionId === conditionId
    );

    if (conditionalStep) {
      // Use the original branch decision
      return conditionalStep.branchTaken === 'then';
    }

    // If no replay data, use current evaluation
    return currentResult;
  }

  // Handle group replay
  shouldExecuteGroup(groupId: string): boolean {
    if (!this.isReplaying) {
      return true; // Normal execution
    }

    // Look for group steps in replay
    const hasGroupSteps = this.replaySteps.some(step =>
      (step.type === 'group_start' || step.type === 'group_end') &&
      step.groupId === groupId
    );

    return hasGroupSteps;
  }
}