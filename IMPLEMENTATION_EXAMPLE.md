# Complete Back Navigation - Implementation Example

## Current Flow Example

```typescript
// current example.ts
const flow = async () => {
  const profile = await group({ message: "Profile" }, async () => {
    const first = await text({
      message: "First name",
      placeholder: "Enter your first name",
      validate: validateRequired,
    });

    const last = await text({
      message: "Last name",
      placeholder: "Enter your last name",
      validate: validateRequired,
    });

    return { first, last };
  });

  const prefs = await group({ message: "Preferences" }, async () => {
    const role = await text({
      message: "Role (user/admin)",
      placeholder: "user or admin",
      validate: (value: string) => {
        if (!["user", "admin"].includes(value.toLowerCase())) {
          return 'Role must be either "user" or "admin"';
        }
        return true;
      },
    });

    if (role.toLowerCase() === "admin") {
      const code = await text({
        message: "Access code",
        placeholder: "Enter admin access code",
        validate: validateRequired,
      });
      return { role, code };
    }

    const newsletter = await confirm({
      message: "Subscribe to newsletter?",
      initial: false,
    });

    return { role, newsletter };
  });

  return { profile, prefs };
};
```

## Enhanced Flow with Back Navigation Support

```typescript
// enhanced example.ts
const flow = async () => {
  const profile = await group({
    message: "Profile",
    id: "profile" // Enable group tracking
  }, async () => {
    const first = await text({
      message: "First name",
      name: "firstName", // Enable variable tracking
      placeholder: "Enter your first name",
      validate: validateRequired,
    });

    const last = await text({
      message: "Last name",
      name: "lastName", // Enable variable tracking
      placeholder: "Enter your last name",
      validate: validateRequired,
    });

    return { first, last };
  });

  const prefs = await group({
    message: "Preferences",
    id: "preferences" // Enable group tracking
  }, async () => {
    const role = await text({
      message: "Role (user/admin)",
      name: "userRole", // Enable variable tracking
      placeholder: "user or admin",
      validate: (value: string) => {
        if (!["user", "admin"].includes(value.toLowerCase())) {
          return 'Role must be either "user" or "admin"';
        }
        return true;
      },
    });

    // Enhanced conditional with tracking
    if (await conditional("isAdmin", () => role.toLowerCase() === "admin")) {
      const code = await text({
        message: "Access code",
        name: "accessCode", // Enable variable tracking
        placeholder: "Enter admin access code",
        validate: validateRequired,
      });
      return { role, code };
    }

    const newsletter = await confirm({
      message: "Subscribe to newsletter?",
      name: "newsletter", // Enable variable tracking
      initial: false,
    });

    return { role, newsletter };
  });

  return { profile, prefs };
};

// Enhanced execution with back navigation
const result = await ask(flow, {
  enableBackNavigation: true,
  maxHistorySteps: 20
});
```

## Step-by-Step Execution Flow

### Step 1: First Name Input
```typescript
// State captured:
{
  stepId: "step_1",
  type: "prompt",
  promptType: "text",
  config: { message: "First name", name: "firstName" },
  flowSnapshot: {
    variables: {},
    executionPath: ["profile.firstName"],
    groupStack: [{ groupId: "profile", startStepId: "step_1" }],
    conditionalStates: []
  }
}

// User enters: "John"
// State updated:
{
  variables: { firstName: "John" },
  // ... rest unchanged
}
```

### Step 2: Last Name Input
```typescript
// State captured:
{
  stepId: "step_2",
  type: "prompt",
  promptType: "text",
  config: { message: "Last name", name: "lastName" },
  flowSnapshot: {
    variables: { firstName: "John" },
    executionPath: ["profile.firstName", "profile.lastName"],
    groupStack: [{ groupId: "profile", startStepId: "step_1" }],
    conditionalStates: []
  }
}

// User enters: "Doe"
// State updated:
{
  variables: { firstName: "John", lastName: "Doe" },
  // ... rest unchanged
}
```

### Step 3: Role Input
```typescript
// State captured:
{
  stepId: "step_3",
  type: "prompt",
  promptType: "text",
  config: { message: "Role (user/admin)", name: "userRole" },
  flowSnapshot: {
    variables: { firstName: "John", lastName: "Doe" },
    executionPath: ["profile.firstName", "profile.lastName", "preferences.userRole"],
    groupStack: [{ groupId: "preferences", startStepId: "step_3" }],
    conditionalStates: []
  }
}

// User enters: "admin"
// State updated:
{
  variables: { firstName: "John", lastName: "Doe", userRole: "admin" },
  // ... rest unchanged
}
```

### Step 4: Conditional Evaluation
```typescript
// Conditional state captured:
{
  stepId: "step_4",
  type: "conditional_branch",
  condition: "isAdmin",
  branchTaken: "then",
  flowSnapshot: {
    variables: { firstName: "John", lastName: "Doe", userRole: "admin" },
    executionPath: ["profile.firstName", "profile.lastName", "preferences.userRole", "preferences.isAdmin"],
    groupStack: [{ groupId: "preferences", startStepId: "step_3" }],
    conditionalStates: [
      {
        conditionId: "isAdmin",
        expression: "role.toLowerCase() === 'admin'",
        result: true,
        dependencies: ["userRole"]
      }
    ]
  }
}
```

### Step 5: Access Code Input (Admin Branch)
```typescript
// State captured:
{
  stepId: "step_5",
  type: "prompt",
  promptType: "text",
  config: { message: "Access code", name: "accessCode" },
  flowSnapshot: {
    variables: { firstName: "John", lastName: "Doe", userRole: "admin" },
    executionPath: ["profile.firstName", "profile.lastName", "preferences.userRole", "preferences.isAdmin", "preferences.accessCode"],
    groupStack: [{ groupId: "preferences", startStepId: "step_3" }],
    conditionalStates: [
      {
        conditionId: "isAdmin",
        expression: "role.toLowerCase() === 'admin'",
        result: true,
        dependencies: ["userRole"]
      }
    ]
  }
}

// User enters: "secret123"
// Final state:
{
  variables: { firstName: "John", lastName: "Doe", userRole: "admin", accessCode: "secret123" },
  // ... rest unchanged
}
```

## Back Navigation Scenarios

### Scenario 1: User Goes Back from Access Code to Role

**User Action**: Press Escape on "Access code" prompt

**System Response**:
1. Navigate to step_3 (Role input)
2. Restore flow snapshot from step_3
3. Show Role prompt with current value "admin"
4. User can modify the role

**If user changes role to "user"**:
1. Update variables: `{ userRole: "user" }`
2. Re-evaluate conditional "isAdmin" → false
3. Skip step_5 (Access code)
4. Jump to newsletter prompt instead

### Scenario 2: User Goes Back from Role to Last Name

**User Action**: Press Escape on "Role" prompt

**System Response**:
1. Navigate to step_2 (Last name input)
2. Restore flow snapshot from step_2
3. Show Last name prompt with current value "Doe"
4. User can modify the last name

**Flow Continuation**:
1. After last name change, continue to role prompt
2. Previous role value is preserved unless user changes it
3. Conditional logic re-evaluates based on current state

## Implementation Classes

### FlowStateManager
```typescript
class FlowStateManager {
  private steps: FlowStep[] = [];
  private currentIndex: number = -1;

  captureState(type: string, config: any): string {
    const stepId = generateStepId();
    const snapshot = this.createSnapshot();

    this.steps.push({
      id: stepId,
      type,
      config: cloneDeep(config),
      flowSnapshot: snapshot,
      timestamp: Date.now()
    });

    this.currentIndex = this.steps.length - 1;
    return stepId;
  }

  goBack(): FlowStep | null {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const step = this.steps[this.currentIndex];
      this.restoreSnapshot(step.flowSnapshot);
      return step;
    }
    return null;
  }
}
```

### ReplayEngine
```typescript
class ReplayEngine {
  constructor(private stateManager: FlowStateManager) {}

  async executeFromStep(stepId: string, flowFn: Function): Promise<any> {
    // Restore state to the target step
    this.stateManager.restoreToStep(stepId);

    // Get steps that should be replayed automatically
    const replaySteps = this.stateManager.getStepsAfter(stepId);

    // Execute flow with replay data
    return this.executeWithReplay(flowFn, replaySteps);
  }

  private async executeWithReplay(flowFn: Function, replaySteps: FlowStep[]): Promise<any> {
    let replayIndex = 0;

    // Override prompt functions to use replay data when available
    const originalText = global.text;
    global.text = async (config: any) => {
      const replayStep = replaySteps[replayIndex++];
      if (replayStep && replayStep.value !== undefined) {
        return replayStep.value; // Use replayed value
      }
      return originalText(config); // Show prompt to user
    };

    try {
      return await flowFn();
    } finally {
      global.text = originalText; // Restore original function
    }
  }
}
```

## Benefits Demonstrated

1. **Complete State Tracking**: Every variable and decision is tracked
2. **Conditional Replay**: Smart handling of if/else branches
3. **Variable Dependencies**: Conditionals re-evaluate when dependencies change
4. **Group Awareness**: Back navigation respects group boundaries
5. **Performance**: Only replay steps that changed, skip unchanged ones
6. **Developer Control**: Opt-in with simple configuration

This architecture enables full back navigation while maintaining the simplicity and elegance of the original API.