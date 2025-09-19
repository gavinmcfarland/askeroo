import { ConditionalState } from './types.js';

export class ConditionalManager {
  private conditions: Map<string, ConditionalState> = new Map();
  private listeners: Array<(conditions: Map<string, ConditionalState>) => void> = [];

  // Record a conditional evaluation
  recordConditional(
    conditionId: string,
    expression: string,
    result: boolean,
    dependencies: string[],
    stepId: string
  ): void {
    const conditionalState: ConditionalState = {
      conditionId,
      expression,
      result,
      dependencies,
      stepId
    };

    this.conditions.set(conditionId, conditionalState);
    this.notifyListeners();
  }

  // Get cached conditional result if still valid
  getCachedResult(conditionId: string, currentVariables: Record<string, any>): boolean | undefined {
    const conditional = this.conditions.get(conditionId);
    if (!conditional) {
      return undefined;
    }

    // Check if any dependencies have changed
    if (this.shouldReEvaluate(conditionId, currentVariables)) {
      return undefined;
    }

    return conditional.result;
  }

  // Check if a conditional should be re-evaluated
  shouldReEvaluate(conditionId: string, currentVariables: Record<string, any>): boolean {
    const conditional = this.conditions.get(conditionId);
    if (!conditional) {
      return true;
    }

    // For now, we'll re-evaluate if any dependent variable exists in current variables
    // In a more sophisticated implementation, we'd track when variables were last modified
    return conditional.dependencies.some(dep => dep in currentVariables);
  }

  // Get all conditionals
  getAllConditionals(): ConditionalState[] {
    return Array.from(this.conditions.values());
  }

  // Get conditional by ID
  getConditional(conditionId: string): ConditionalState | undefined {
    return this.conditions.get(conditionId);
  }

  // Check if conditional exists
  hasConditional(conditionId: string): boolean {
    return this.conditions.has(conditionId);
  }

  // Clear all conditionals
  clear(): void {
    this.conditions.clear();
    this.notifyListeners();
  }

  // Remove specific conditional
  removeConditional(conditionId: string): boolean {
    const removed = this.conditions.delete(conditionId);
    if (removed) {
      this.notifyListeners();
    }
    return removed;
  }

  // Get dependencies for a conditional
  getDependencies(conditionId: string): string[] {
    const conditional = this.conditions.get(conditionId);
    return conditional ? [...conditional.dependencies] : [];
  }

  // Find conditionals that depend on a variable
  findConditionalsByDependency(variableName: string): ConditionalState[] {
    return Array.from(this.conditions.values()).filter(conditional =>
      conditional.dependencies.includes(variableName)
    );
  }

  // Update conditional result (for when re-evaluation occurs)
  updateConditionalResult(conditionId: string, newResult: boolean, newStepId: string): void {
    const conditional = this.conditions.get(conditionId);
    if (conditional) {
      conditional.result = newResult;
      conditional.stepId = newStepId;
      this.notifyListeners();
    }
  }

  // Subscribe to conditional changes
  subscribe(listener: (conditions: Map<string, ConditionalState>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(new Map(this.conditions)));
  }

  // Analyze conditional dependencies (helper for complex flows)
  analyzeDependencies(): { [conditionId: string]: string[] } {
    const analysis: { [conditionId: string]: string[] } = {};

    for (const [conditionId, conditional] of this.conditions) {
      analysis[conditionId] = [...conditional.dependencies];
    }

    return analysis;
  }

  // Get evaluation order (conditionals sorted by dependencies)
  getEvaluationOrder(): string[] {
    const conditionals = Array.from(this.conditions.values());
    const order: string[] = [];
    const visited = new Set<string>();

    // Simple topological sort based on dependencies
    const visit = (conditionId: string) => {
      if (visited.has(conditionId)) return;
      visited.add(conditionId);

      const conditional = this.conditions.get(conditionId);
      if (conditional) {
        // Visit dependencies first (if they are also conditionals)
        for (const dep of conditional.dependencies) {
          if (this.conditions.has(dep)) {
            visit(dep);
          }
        }
        order.push(conditionId);
      }
    };

    for (const conditionId of this.conditions.keys()) {
      visit(conditionId);
    }

    return order;
  }
}