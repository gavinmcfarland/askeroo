import {
  FlowStep,
  FlowSnapshot,
  GroupStackItem,
  ConditionalState,
  BranchPath
} from './types.js';

export class FlowStateManager {
  private steps: FlowStep[] = [];
  private currentIndex: number = -1;
  private variables: Record<string, any> = {};
  private groupStack: GroupStackItem[] = [];
  private conditionalStates: ConditionalState[] = [];
  private executionPath: string[] = [];
  private listeners: Array<(state: any) => void> = [];

  // Generate unique step ID
  private generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Create a snapshot of current flow state
  private createSnapshot(): FlowSnapshot {
    return {
      variables: { ...this.variables },
      executionPath: [...this.executionPath],
      groupStack: this.groupStack.map(item => ({ ...item })),
      conditionalStates: this.conditionalStates.map(state => ({ ...state }))
    };
  }

  // Restore flow state from snapshot
  private restoreSnapshot(snapshot: FlowSnapshot): void {
    this.variables = { ...snapshot.variables };
    this.executionPath = [...snapshot.executionPath];
    this.groupStack = snapshot.groupStack.map(item => ({ ...item }));
    this.conditionalStates = snapshot.conditionalStates.map(state => ({ ...state }));
    this.notifyListeners();
  }

  // Capture state before a prompt
  capturePromptState(type: 'text' | 'confirm', config: any): string {
    const stepId = this.generateStepId();
    const snapshot = this.createSnapshot();

    const step: FlowStep = {
      id: stepId,
      type: 'prompt',
      timestamp: Date.now(),
      promptType: type,
      config: this.deepClone(config),
      flowSnapshot: snapshot
    };

    this.steps.push(step);
    this.currentIndex = this.steps.length - 1;

    // Add to execution path
    const pathName = config.name || `${type}_${this.steps.length}`;
    this.executionPath.push(pathName);

    this.notifyListeners();
    return stepId;
  }

  // Record the user's response to a prompt
  recordPromptValue(stepId: string, value: any): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step && step.config?.name) {
      step.value = value;
      this.variables[step.config.name] = value;
      this.notifyListeners();
    }
  }

  // Capture group start
  captureGroupStart(groupId: string, config: any): string {
    const stepId = this.generateStepId();
    const snapshot = this.createSnapshot();

    const step: FlowStep = {
      id: stepId,
      type: 'group_start',
      timestamp: Date.now(),
      groupId,
      groupConfig: this.deepClone(config),
      flowSnapshot: snapshot
    };

    this.steps.push(step);
    this.currentIndex = this.steps.length - 1;

    // Push group onto stack
    this.groupStack.push({
      groupId,
      config: this.deepClone(config),
      startStepId: stepId,
      variables: { ...this.variables }
    });

    this.executionPath.push(`group_${groupId}_start`);
    this.notifyListeners();
    return stepId;
  }

  // Capture group end
  captureGroupEnd(groupId: string): string {
    const stepId = this.generateStepId();
    const snapshot = this.createSnapshot();

    const step: FlowStep = {
      id: stepId,
      type: 'group_end',
      timestamp: Date.now(),
      groupId,
      flowSnapshot: snapshot
    };

    this.steps.push(step);
    this.currentIndex = this.steps.length - 1;

    // Pop group from stack
    this.groupStack.pop();

    this.executionPath.push(`group_${groupId}_end`);
    this.notifyListeners();
    return stepId;
  }

  // Capture conditional evaluation
  captureConditional(conditionId: string, expression: string, result: boolean, dependencies: string[]): string {
    const stepId = this.generateStepId();
    const snapshot = this.createSnapshot();

    const step: FlowStep = {
      id: stepId,
      type: 'conditional',
      timestamp: Date.now(),
      conditionId,
      condition: expression,
      branchTaken: result ? 'then' : 'else',
      flowSnapshot: snapshot
    };

    this.steps.push(step);
    this.currentIndex = this.steps.length - 1;

    // Record conditional state
    const conditionalState: ConditionalState = {
      conditionId,
      expression,
      result,
      dependencies,
      stepId
    };

    this.conditionalStates.push(conditionalState);
    this.executionPath.push(`conditional_${conditionId}_${result ? 'then' : 'else'}`);
    this.notifyListeners();
    return stepId;
  }

  // Check if we can go back
  canGoBack(): boolean {
    // Can go back if we have previous prompt steps
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      if (this.steps[i].type === 'prompt') {
        return true;
      }
    }
    return false;
  }

  // Go back to previous prompt step
  goBack(): FlowStep | null {
    if (!this.canGoBack()) {
      return null;
    }

    // Find the previous prompt step
    for (let i = this.currentIndex - 1; i >= 0; i--) {
      const step = this.steps[i];
      if (step.type === 'prompt') {
        // Set current index to this step
        this.currentIndex = i;

        // Restore the snapshot from this step
        if (step.flowSnapshot) {
          this.restoreSnapshot(step.flowSnapshot);
        }

        this.notifyListeners();
        return step;
      }
    }

    return null;
  }

  // Get current step
  getCurrentStep(): FlowStep | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.steps.length) {
      return null;
    }
    return this.steps[this.currentIndex];
  }

  // Get all steps
  getAllSteps(): FlowStep[] {
    return [...this.steps];
  }

  // Get steps after current index (for replay)
  getStepsAfter(stepId: string): FlowStep[] {
    const stepIndex = this.steps.findIndex(s => s.id === stepId);
    if (stepIndex === -1) return [];
    return this.steps.slice(stepIndex + 1);
  }

  // Get variable value
  getVariable(name: string): any {
    return this.variables[name];
  }

  // Get all variables
  getAllVariables(): Record<string, any> {
    return { ...this.variables };
  }

  // Check if a conditional should be re-evaluated
  shouldReEvaluateConditional(conditionId: string): boolean {
    const conditional = this.conditionalStates.find(c => c.conditionId === conditionId);
    if (!conditional) return true;

    // Check if any dependent variables have changed since the conditional was evaluated
    const conditionalStepIndex = this.steps.findIndex(s => s.id === conditional.stepId);

    for (const dep of conditional.dependencies) {
      // Find the most recent step that modified this variable
      for (let i = this.steps.length - 1; i > conditionalStepIndex; i--) {
        const step = this.steps[i];
        if (step.type === 'prompt' && step.config?.name === dep) {
          return true; // Variable was modified after conditional
        }
      }
    }

    return false;
  }

  // Get conditional result if still valid
  getConditionalResult(conditionId: string): boolean | undefined {
    if (this.shouldReEvaluateConditional(conditionId)) {
      return undefined;
    }

    const conditional = this.conditionalStates.find(c => c.conditionId === conditionId);
    return conditional?.result;
  }

  // Reset all state
  reset(): void {
    this.steps = [];
    this.currentIndex = -1;
    this.variables = {};
    this.groupStack = [];
    this.conditionalStates = [];
    this.executionPath = [];
    this.notifyListeners();
  }

  // Event subscription
  subscribe(listener: (state: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    // Count only prompt steps for user-friendly numbering
    const promptSteps = this.steps.filter(step => step.type === 'prompt');
    const currentPromptIndex = promptSteps.findIndex(step => step.id === this.getCurrentStep()?.id);

    const state = {
      steps: this.getAllSteps(),
      currentIndex: this.currentIndex,
      promptSteps: promptSteps,
      currentPromptIndex: currentPromptIndex >= 0 ? currentPromptIndex : promptSteps.length - 1,
      totalPrompts: promptSteps.length,
      variables: this.getAllVariables(),
      canGoBack: this.canGoBack(),
      currentStep: this.getCurrentStep()
    };

    this.listeners.forEach(listener => listener(state));
  }

  // Deep clone utility
  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => this.deepClone(item)) as any;
    if (typeof obj === 'object') {
      const cloned = {} as any;
      for (const key in obj) {
        cloned[key] = this.deepClone(obj[key]);
      }
      return cloned;
    }
    return obj;
  }
}