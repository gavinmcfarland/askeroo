# Complete Back Navigation Architecture Design

## Overview

This document outlines the architecture needed to implement full back navigation in the askeroo CLI library, supporting flow state serialization, replay systems, and conditional logic handling.

## 1. Flow State Serialization System

### Core Concept
Capture and serialize the complete flow state at each prompt, enabling restoration to any previous state.

### Data Structures

```typescript
interface FlowStep {
  id: string;
  type: 'prompt' | 'group_start' | 'group_end' | 'conditional_branch';
  timestamp: number;

  // For prompts
  promptType?: 'text' | 'confirm';
  config?: any;
  value?: any;

  // For groups
  groupConfig?: GroupConfig;
  groupId?: string;

  // For conditionals
  condition?: string; // serialized condition
  branchTaken?: string; // which branch was executed

  // Flow context
  flowSnapshot?: FlowSnapshot;
}

interface FlowSnapshot {
  // Variables in scope at this point
  variables: Record<string, any>;

  // Function execution path (for replay)
  executionPath: ExecutionNode[];

  // Group nesting state
  groupStack: GroupStackItem[];

  // Conditional states
  conditionalStates: ConditionalState[];
}

interface ExecutionNode {
  nodeId: string;
  nodeType: 'prompt' | 'group' | 'conditional' | 'expression';
  lineNumber?: number; // for debugging
  functionName?: string;
}

interface GroupStackItem {
  groupId: string;
  config: GroupConfig;
  startStepId: string;
  variables: Record<string, any>;
}

interface ConditionalState {
  conditionId: string;
  expression: string;
  result: boolean;
  dependencies: string[]; // variable names this condition depends on
}
```

### Implementation Strategy

```typescript
// Flow State Manager
class FlowStateManager {
  private steps: FlowStep[] = [];
  private currentIndex: number = -1;
  private flowSnapshot: FlowSnapshot = {
    variables: {},
    executionPath: [],
    groupStack: [],
    conditionalStates: []
  };

  // Capture state before each prompt
  capturePromptState(type: 'text' | 'confirm', config: any): string {
    const stepId = generateStepId();
    const step: FlowStep = {
      id: stepId,
      type: 'prompt',
      timestamp: Date.now(),
      promptType: type,
      config: cloneDeep(config),
      flowSnapshot: cloneDeep(this.flowSnapshot)
    };

    this.steps.push(step);
    this.currentIndex = this.steps.length - 1;
    return stepId;
  }

  // Record the user's response
  recordPromptValue(stepId: string, value: any): void {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      step.value = value;
      // Update flow snapshot with new variable
      this.updateVariables(step.config.name, value);
    }
  }

  // Navigate back to previous step
  goBack(): FlowStep | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const step = this.steps[this.currentIndex];
      this.restoreFlowSnapshot(step.flowSnapshot);
      return step;
    }
    return null;
  }

  private updateVariables(name: string, value: any): void {
    if (name) {
      this.flowSnapshot.variables[name] = value;
    }
  }

  private restoreFlowSnapshot(snapshot: FlowSnapshot): void {
    this.flowSnapshot = cloneDeep(snapshot);
  }
}
```

## 2. Flow Replay Architecture

### Core Concept
Transform the original flow function into a replayable execution engine that can start from any captured state.

### Flow Function Transformation

```typescript
// Original flow function
const originalFlow = async () => {
  const profile = await group({ message: "Profile" }, async () => {
    const first = await text({ message: "First name" });
    const last = await text({ message: "Last name" });
    return { first, last };
  });

  const prefs = await group({ message: "Preferences" }, async () => {
    const role = await text({ message: "Role" });
    if (role === "admin") {
      const code = await text({ message: "Access code" });
      return { role, code };
    }
    return { role };
  });

  return { profile, prefs };
};

// Transformed into replayable flow
class ReplayableFlow {
  constructor(private stateManager: FlowStateManager) {}

  async execute(fromStepId?: string): Promise<any> {
    // If replaying, restore state first
    if (fromStepId) {
      this.stateManager.restoreToStep(fromStepId);
    }

    // Execute the flow with state capture
    return await this.executeFlow();
  }

  private async executeFlow(): Promise<any> {
    const profile = await this.executeGroup("profile", async () => {
      const first = await this.executePrompt("text", {
        message: "First name",
        name: "first"
      });
      const last = await this.executePrompt("text", {
        message: "Last name",
        name: "last"
      });
      return { first, last };
    });

    const prefs = await this.executeGroup("preferences", async () => {
      const role = await this.executePrompt("text", {
        message: "Role",
        name: "role"
      });

      // Conditional execution with state capture
      if (await this.evaluateCondition("role_is_admin", () => role === "admin")) {
        const code = await this.executePrompt("text", {
          message: "Access code",
          name: "code"
        });
        return { role, code };
      }

      return { role };
    });

    return { profile, prefs };
  }

  private async executePrompt(type: 'text' | 'confirm', config: any): Promise<any> {
    // Check if we're replaying and this value already exists
    const existingValue = this.stateManager.getReplayValue(config.name);
    if (existingValue !== undefined) {
      return existingValue;
    }

    // Capture state before prompt
    const stepId = this.stateManager.capturePromptState(type, config);

    // Show prompt to user
    const value = await (type === 'text' ? text(config) : confirm(config));

    // Record the response
    this.stateManager.recordPromptValue(stepId, value);

    return value;
  }

  private async executeGroup<T>(groupId: string, fn: () => Promise<T>): Promise<T> {
    this.stateManager.enterGroup(groupId);
    try {
      return await fn();
    } finally {
      this.stateManager.exitGroup(groupId);
    }
  }

  private async evaluateCondition(conditionId: string, condition: () => boolean): Promise<boolean> {
    // Check if we have a cached result for this condition
    const cachedResult = this.stateManager.getConditionalResult(conditionId);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Evaluate condition and cache result
    const result = condition();
    this.stateManager.recordConditional(conditionId, result);
    return result;
  }
}
```

### Flow Parser/Transformer

```typescript
// Automatic transformation of flow functions
class FlowTransformer {
  static transform(flowFunction: Function): ReplayableFlow {
    // Parse the function AST
    const ast = parseFunction(flowFunction);

    // Transform async/await calls to tracked calls
    const transformedAst = this.transformAst(ast);

    // Generate replayable flow class
    return this.generateReplayableFlow(transformedAst);
  }

  private static transformAst(ast: any): any {
    // Transform text() calls to this.executePrompt('text', ...)
    // Transform confirm() calls to this.executePrompt('confirm', ...)
    // Transform group() calls to this.executeGroup(...)
    // Transform if statements to this.evaluateCondition(...)
    return transformedAst;
  }
}
```

## 3. Conditional Logic Handling

### Core Concept
Track conditional branches and their dependencies to ensure consistent replay behavior.

### Conditional State Management

```typescript
interface ConditionalDependency {
  variableName: string;
  stepId: string; // when this variable was set
}

class ConditionalManager {
  private conditions: Map<string, ConditionalState> = new Map();
  private dependencies: Map<string, ConditionalDependency[]> = new Map();

  // Record a conditional evaluation
  recordConditional(
    conditionId: string,
    expression: string,
    result: boolean,
    dependencies: string[]
  ): void {
    this.conditions.set(conditionId, {
      conditionId,
      expression,
      result,
      dependencies
    });

    // Track which variables this condition depends on
    this.dependencies.set(conditionId,
      dependencies.map(varName => ({
        variableName: varName,
        stepId: this.getCurrentStepForVariable(varName)
      }))
    );
  }

  // Check if a condition should be re-evaluated
  shouldReEvaluate(conditionId: string, currentVariables: Record<string, any>): boolean {
    const deps = this.dependencies.get(conditionId);
    if (!deps) return true;

    // Check if any dependent variables have changed
    return deps.some(dep => {
      const currentStepId = this.getCurrentStepForVariable(dep.variableName);
      return currentStepId !== dep.stepId;
    });
  }

  // Get the cached result if still valid
  getCachedResult(conditionId: string, currentVariables: Record<string, any>): boolean | undefined {
    if (this.shouldReEvaluate(conditionId, currentVariables)) {
      return undefined;
    }
    return this.conditions.get(conditionId)?.result;
  }
}
```

### Branch Tracking

```typescript
interface BranchPath {
  conditionId: string;
  branchTaken: 'then' | 'else';
  branchSteps: string[]; // step IDs executed in this branch
}

class BranchTracker {
  private branchPaths: BranchPath[] = [];
  private currentBranch: BranchPath | null = null;

  startBranch(conditionId: string, branchTaken: 'then' | 'else'): void {
    this.currentBranch = {
      conditionId,
      branchTaken,
      branchSteps: []
    };
  }

  addStepToBranch(stepId: string): void {
    if (this.currentBranch) {
      this.currentBranch.branchSteps.push(stepId);
    }
  }

  endBranch(): void {
    if (this.currentBranch) {
      this.branchPaths.push(this.currentBranch);
      this.currentBranch = null;
    }
  }

  // When replaying, skip steps that were in branches not taken
  shouldSkipStep(stepId: string): boolean {
    for (const branch of this.branchPaths) {
      if (branch.branchSteps.includes(stepId)) {
        // Check if this branch should be taken in replay
        return !this.shouldTakeBranch(branch.conditionId, branch.branchTaken);
      }
    }
    return false;
  }
}
```

## 4. Implementation Plan

### Phase 1: Core Infrastructure
1. **FlowStateManager**: Implement basic state capture and restoration
2. **Step Management**: Create step ID generation and tracking
3. **Variable Tracking**: Implement variable state management

### Phase 2: Replay System
1. **ReplayableFlow**: Create base replayable flow class
2. **Flow Transformation**: Implement AST parsing and transformation
3. **Prompt Wrapping**: Wrap text() and confirm() calls with state capture

### Phase 3: Conditional Logic
1. **ConditionalManager**: Implement conditional state tracking
2. **Branch Tracking**: Add branch path management
3. **Dependency Analysis**: Implement variable dependency tracking

### Phase 4: Integration
1. **Core Integration**: Update core.ts to use replay system
2. **UI Updates**: Modify PromptApp to support full back navigation
3. **Testing**: Comprehensive testing of all scenarios

### Phase 5: Optimization
1. **Performance**: Optimize state serialization for large flows
2. **Memory Management**: Implement state pruning for long flows
3. **Developer Experience**: Add debugging tools and better error messages

## 5. API Design

### Updated Core API

```typescript
// Enhanced ask function with replay support
export async function ask<T>(
  flowFn: FlowFunction<T>,
  options?: {
    enableBackNavigation?: boolean;
    maxHistorySteps?: number;
    debugMode?: boolean;
  }
): Promise<T> {
  if (options?.enableBackNavigation) {
    const replayableFlow = FlowTransformer.transform(flowFn);
    return replayableFlow.execute();
  } else {
    // Fallback to current implementation
    return executeSimpleFlow(flowFn);
  }
}

// Enhanced text function with naming
export async function text(config: TextFieldConfig & { name?: string }): Promise<string> {
  // Implementation with state capture
}

// Enhanced group function with IDs
export async function group<T>(
  config: GroupConfig & { id?: string },
  fn: () => Promise<T>
): Promise<T> {
  // Implementation with group tracking
}
```

### Developer Experience

```typescript
// Developers can opt-in to full back navigation
const result = await ask(myFlow, {
  enableBackNavigation: true,
  maxHistorySteps: 50
});

// Named prompts for better state tracking
const name = await text({
  message: "Name",
  name: "userName" // enables back navigation
});

// Named groups for better tracking
const profile = await group({
  message: "Profile",
  id: "user_profile"
}, async () => {
  // ...
});
```

## 6. Benefits of This Architecture

1. **Full Back Navigation**: Complete support for going back to any previous step
2. **Conditional Handling**: Proper replay of conditional branches
3. **State Consistency**: Guaranteed consistent state during replay
4. **Performance**: Efficient state management with minimal overhead
5. **Developer Friendly**: Optional opt-in with clear naming conventions
6. **Debugging**: Rich debugging information for complex flows
7. **Backward Compatible**: Existing flows continue to work without changes

## 7. Challenges & Solutions

### Challenge: Large Flow Performance
**Solution**: Implement state pruning and compression for long flows

### Challenge: Complex Conditional Logic
**Solution**: Dependency tracking and smart re-evaluation

### Challenge: Developer Experience
**Solution**: Automatic transformation with optional manual annotations

### Challenge: Memory Usage
**Solution**: Configurable history limits and state compression

This architecture provides a complete solution for back navigation while maintaining the simplicity and elegance of the current API.