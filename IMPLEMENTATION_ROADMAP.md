# Implementation Roadmap for Complete Back Navigation

## Phase 1: Foundation (Week 1-2)

### 1.1 Core Data Structures
```typescript
// src/flow-state/types.ts
interface FlowStep {
  id: string;
  type: 'prompt' | 'group_start' | 'group_end' | 'conditional';
  timestamp: number;
  config?: any;
  value?: any;
  flowSnapshot?: FlowSnapshot;
}

interface FlowSnapshot {
  variables: Record<string, any>;
  executionPath: string[];
  groupStack: GroupStackItem[];
  conditionalStates: ConditionalState[];
}
```

### 1.2 Flow State Manager
```typescript
// src/flow-state/FlowStateManager.ts
export class FlowStateManager {
  private steps: FlowStep[] = [];
  private currentIndex: number = -1;
  private variables: Record<string, any> = {};
  private groupStack: GroupStackItem[] = [];

  // Implementation of core state management methods
}
```

### 1.3 Update Core API
```typescript
// src/core.ts - Enhanced with optional state tracking
export async function text(config: TextFieldConfig & { name?: string }): Promise<string> {
  // Add state capture when name is provided
}

export async function ask<T>(
  flowFn: FlowFunction<T>,
  options?: { enableBackNavigation?: boolean }
): Promise<T> {
  // Route to appropriate execution mode
}
```

**Deliverables:**
- [ ] Core data structures defined
- [ ] FlowStateManager class implemented
- [ ] Basic state capture in text() and confirm()
- [ ] Unit tests for state management

## Phase 2: Basic Replay System (Week 3-4)

### 2.1 Replay Engine
```typescript
// src/flow-replay/ReplayEngine.ts
export class ReplayEngine {
  constructor(private stateManager: FlowStateManager) {}

  async executeWithReplay(flowFn: Function, fromStepId?: string): Promise<any> {
    // Core replay logic
  }

  private async replaySteps(steps: FlowStep[]): Promise<void> {
    // Automatic step replay
  }
}
```

### 2.2 Enhanced PromptApp
```typescript
// src/components/PromptApp.tsx - Updated for replay
export const PromptApp: React.FC<PromptAppProps> = ({
  flowManager,
  flowFunction,
  onComplete,
  onError,
  onExit,
  enableBackNavigation = false // New prop
}) => {
  // Enhanced state management for back navigation
  const [flowState, setFlowState] = useState<FlowStateManager | null>(null);

  const handleBack = useCallback(() => {
    if (enableBackNavigation && flowState?.canGoBack()) {
      const previousStep = flowState.goBack();
      if (previousStep) {
        // Restart flow from previous step
        restartFromStep(previousStep.id);
      }
    } else {
      // Show current limitation message
    }
  }, [enableBackNavigation, flowState]);
}
```

**Deliverables:**
- [ ] ReplayEngine class implemented
- [ ] PromptApp updated with replay support
- [ ] Basic back navigation working for simple flows
- [ ] Integration tests with simple scenarios

## Phase 3: Conditional Logic Support (Week 5-6)

### 3.1 Conditional Manager
```typescript
// src/flow-state/ConditionalManager.ts
export class ConditionalManager {
  private conditions: Map<string, ConditionalState> = new Map();
  private dependencies: Map<string, string[]> = new Map();

  recordConditional(id: string, expression: string, result: boolean, deps: string[]): void {
    // Track conditional evaluations
  }

  shouldReEvaluate(conditionId: string, currentVars: Record<string, any>): boolean {
    // Determine if condition needs re-evaluation
  }
}
```

### 3.2 Enhanced Flow Functions
```typescript
// src/core.ts - Add conditional tracking
export async function conditional<T>(
  id: string,
  condition: () => boolean
): Promise<boolean> {
  // New function for trackable conditionals
}

// Enhanced group function
export async function group<T>(
  config: GroupConfig & { id?: string },
  fn: () => Promise<T>
): Promise<T> {
  // Add group tracking
}
```

### 3.3 Branch Tracking
```typescript
// src/flow-state/BranchTracker.ts
export class BranchTracker {
  private activeBranches: BranchPath[] = [];

  startBranch(conditionId: string, branchType: 'then' | 'else'): void {
    // Track branch execution
  }

  shouldSkipStep(stepId: string, currentState: FlowSnapshot): boolean {
    // Determine if step should be skipped during replay
  }
}
```

**Deliverables:**
- [ ] ConditionalManager implemented
- [ ] conditional() function added to API
- [ ] Branch tracking system working
- [ ] Complex conditional flows supported

## Phase 4: Advanced Features (Week 7-8)

### 4.1 Performance Optimizations
```typescript
// src/flow-state/StateCompressor.ts
export class StateCompressor {
  static compress(snapshot: FlowSnapshot): CompressedSnapshot {
    // Compress large state objects
  }

  static decompress(compressed: CompressedSnapshot): FlowSnapshot {
    // Restore compressed state
  }
}

// src/flow-state/HistoryPruner.ts
export class HistoryPruner {
  static pruneHistory(steps: FlowStep[], maxSteps: number): FlowStep[] {
    // Keep only recent steps to manage memory
  }
}
```

### 4.2 Developer Experience
```typescript
// src/debug/FlowDebugger.ts
export class FlowDebugger {
  static visualizeFlow(stateManager: FlowStateManager): string {
    // Generate flow visualization
  }

  static exportFlowState(stateManager: FlowStateManager): string {
    // Export state for debugging
  }
}
```

### 4.3 Error Handling
```typescript
// src/flow-state/ErrorRecovery.ts
export class ErrorRecovery {
  static recoverFromError(error: Error, stateManager: FlowStateManager): FlowStep | null {
    // Attempt to recover to last valid state
  }
}
```

**Deliverables:**
- [ ] Performance optimizations implemented
- [ ] Developer debugging tools
- [ ] Comprehensive error handling
- [ ] Memory management for long flows

## Phase 5: Integration & Testing (Week 9-10)

### 5.1 Complete Integration
```typescript
// Updated example showcasing all features
const advancedFlow = async () => {
  const profile = await group({
    message: "Profile",
    id: "profile"
  }, async () => {
    const name = await text({
      message: "Name",
      name: "userName",
      validate: validateRequired
    });

    const age = await text({
      message: "Age",
      name: "userAge",
      validate: validateNumber
    });

    return { name, age };
  });

  const preferences = await group({
    message: "Preferences",
    id: "prefs"
  }, async () => {
    const role = await text({
      message: "Role",
      name: "userRole"
    });

    if (await conditional("isAdmin", () => role === "admin")) {
      const permissions = await text({
        message: "Permissions",
        name: "adminPermissions"
      });
      return { role, permissions };
    }

    if (await conditional("isPremium", () => profile.age >= 18)) {
      const tier = await text({
        message: "Premium tier",
        name: "premiumTier"
      });
      return { role, tier };
    }

    return { role };
  });

  return { profile, preferences };
};

// Usage with full back navigation
const result = await ask(advancedFlow, {
  enableBackNavigation: true,
  maxHistorySteps: 50,
  debugMode: true
});
```

### 5.2 Comprehensive Testing
- [ ] Unit tests for all state management classes
- [ ] Integration tests for complex flows
- [ ] Performance tests with large flows
- [ ] Memory leak tests
- [ ] Browser compatibility tests

### 5.3 Documentation
- [ ] Updated API documentation
- [ ] Migration guide from simple to advanced flows
- [ ] Performance best practices
- [ ] Troubleshooting guide

## Implementation Priority

### High Priority (Must Have)
1. **Flow State Serialization** - Core functionality
2. **Basic Replay System** - Essential for back navigation
3. **Conditional Logic** - Required for complex flows
4. **Integration with Current API** - Backward compatibility

### Medium Priority (Should Have)
1. **Performance Optimizations** - Important for large flows
2. **Developer Debugging Tools** - Improved DX
3. **Error Recovery** - Better reliability

### Low Priority (Nice to Have)
1. **Advanced Visualizations** - Enhanced debugging
2. **State Export/Import** - Development tools
3. **Flow Analytics** - Usage insights

## File Structure
```
src/
├── flow-state/
│   ├── FlowStateManager.ts
│   ├── ConditionalManager.ts
│   ├── BranchTracker.ts
│   ├── StateCompressor.ts
│   └── types.ts
├── flow-replay/
│   ├── ReplayEngine.ts
│   ├── FlowTransformer.ts
│   └── ExecutionContext.ts
├── debug/
│   ├── FlowDebugger.ts
│   └── StateVisualizer.ts
└── components/
    ├── PromptApp.tsx (enhanced)
    └── BackNavigationProvider.tsx (new)
```

## Success Criteria

### Phase 1 Success
- [ ] Basic state capture working
- [ ] Simple flows can be rewound one step
- [ ] No regression in existing functionality

### Phase 2 Success
- [ ] Full back navigation in linear flows
- [ ] State restoration working correctly
- [ ] UI updates properly on back navigation

### Phase 3 Success
- [ ] Conditional flows support back navigation
- [ ] Branch re-evaluation working
- [ ] Complex flows like the admin/user example work

### Final Success
- [ ] All flow types support full back navigation
- [ ] Performance acceptable for flows up to 100 steps
- [ ] Developer experience is intuitive
- [ ] Comprehensive test coverage (>90%)
- [ ] Documentation complete and clear

This roadmap provides a structured approach to implementing complete back navigation while maintaining the library's simplicity and reliability.