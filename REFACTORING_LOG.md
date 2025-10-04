# Refactoring Log

This document tracks the architectural improvements made to the Askeroo codebase.

## Phase 1: Extract IdGenerator Class ✅

**Date:** October 4, 2025  
**Status:** Complete

### Changes Made

1. **Created `src/core/IdGenerator.ts`**

    - Extracted all ID generation logic from `core.ts` into a dedicated class
    - Encapsulated the `simpleHash` function as a private method
    - Created clear interfaces for field and group ID contexts

2. **Updated `src/core.ts`**
    - Removed standalone `simpleHash()` and `generateId()` functions
    - Added `IdGenerator` instance to runtime
    - Replaced all `generateId()` calls with `idGenerator.generateFieldId()` and `idGenerator.generateGroupId()`
    - Replaced `groupCount` variable management with `idGenerator.incrementGroupCount()`, `idGenerator.getGroupCount()`, and `idGenerator.reset()`

### Benefits

-   **Testability**: ID generation logic can now be unit tested independently
-   **Single Responsibility**: The `IdGenerator` class has one clear purpose
-   **Maintainability**: Easier to find and modify ID generation logic
-   **Type Safety**: Better TypeScript inference with dedicated interfaces
-   **Reusability**: Can be used outside of runtime if needed

### API

```typescript
class IdGenerator {
    generateFieldId(context: FieldIdContext): string;
    generateGroupId(context: GroupIdContext): string;
    incrementGroupCount(): number;
    getGroupCount(): number;
    reset(): void;
}
```

### Build Status

✅ TypeScript compilation successful  
✅ No linter errors  
✅ Generated types are correct

## Phase 2: Extract RuntimeState Class ✅

**Date:** October 4, 2025  
**Status:** Complete

### Changes Made

1. **Created `src/core/RuntimeState.ts`**

    - Extracted all state management from closure variables into a dedicated class
    - Manages answers, interactive prompts, navigation state, and group stack
    - Provides clean methods for state manipulation and queries
    - Includes specialized navigation helpers for back navigation and replay

2. **Updated `src/core.ts`**
    - Replaced 9 state variables with a single `RuntimeState` instance
    - Converted ~50 direct state accesses to method calls
    - Improved readability with semantic method names

### State Variables Extracted

Before (closure variables):

-   `answers: Answers = {}`
-   `interactivePrompts: string[] = []`
-   `currentStep = 0`
-   `asking = false`
-   `isReplaying = false`
-   `groupStack: string[] = []`
-   `lastProcessedGroups: Set<string> = new Set()`

After (single state object):

-   `state = new RuntimeState()`

### Key Methods

**Answers Management:**

-   `addAnswer()`, `getAnswer()`, `hasAnswer()`, `deleteAnswer()`
-   `getAllAnswers()`, `getAnswerCount()`

**Navigation:**

-   `getCurrentStep()`, `incrementStep()`, `decrementStep()`, `setStep()`
-   `clearFutureAnswers()`, `clearUnreachableAnswers()`

**Groups:**

-   `pushGroup()`, `popGroup()`, `getCurrentGroup()`, `getGroupStack()`
-   `markGroupAsProcessed()`, `isGroupProcessed()`, `clearProcessedGroups()`

**Prompts:**

-   `addPrompt()`, `getPrompts()`, `getCurrentPromptIndex()`, `getPromptCount()`

**State Queries:**

-   `isAsking()`, `isReplaying()`
-   `getSnapshot()` (for debugging)

### Benefits

-   **Encapsulation**: State is no longer scattered across closures
-   **Testability**: State can be instantiated and tested independently
-   **Debuggability**: Can inspect state with `state.getSnapshot()`
-   **Clarity**: Method names make intent explicit (e.g., `clearFutureAnswers()`)
-   **Type Safety**: Better IDE autocomplete and error checking

### Build Status

✅ TypeScript compilation successful  
✅ No linter errors  
✅ Generated types are correct  
✅ ~100 lines removed from core.ts

## Phase 3: Extract DiscoveryService Class ✅

**Date:** October 4, 2025  
**Status:** Complete

### Changes Made

1. **Created `src/core/DiscoveryService.ts`**

    - Extracted all static group field discovery logic into a dedicated service
    - Manages discovery mode state, discovered fields, and group body storage
    - Provides clean API for discovery and re-discovery operations
    - Includes debugging capabilities via `getSnapshot()`

2. **Updated `src/core.ts`**
    - Replaced 3 discovery-related variables with a single `DiscoveryService` instance
    - Removed 38-line `runStaticGroupDiscovery()` function
    - Simplified `rediscoverStaticGroupFields()` to 3 lines (was 29 lines)
    - Updated all discovery mode checks and field tracking to use service methods

### Variables & Functions Extracted

Before (closure variables & functions):

-   `isDiscoveryMode = false`
-   `discoveredFields: Map<...> = new Map()`
-   `staticGroupBodies: Map<...> = new Map()`
-   `runStaticGroupDiscovery()` (38 lines)
-   `rediscoverStaticGroupFields()` (29 lines)

After (single service):

-   `discovery = new DiscoveryService(state)`

### Key Methods

**Discovery Management:**

-   `inDiscoveryMode()` - Check if in discovery mode
-   `discover(groupId, body)` - Run discovery for a static group
-   `rediscover(groupId)` - Re-discover fields after changes

**Field Tracking:**

-   `getDiscoveredFields(groupId)` - Get fields for a group
-   `addDiscoveredField(groupId, field)` - Track a discovered field

**Body Storage:**

-   `storeGroupBody(groupId, body)` - Store body for re-discovery
-   `hasGroupBody(groupId)` - Check if body is stored

**Utilities:**

-   `clear()` - Clear all discovery state
-   `getSnapshot()` - Get debug snapshot

### Benefits

-   **Separation of Concerns**: Discovery logic isolated from core runtime
-   **Cleaner API**: Self-documenting method names
-   **Testability**: Service can be tested independently
-   **Maintainability**: All discovery logic in one place
-   **Debuggability**: `getSnapshot()` for inspecting discovery state

### Build Status

✅ TypeScript compilation successful  
✅ No linter errors  
✅ Generated types are correct  
✅ 80 lines removed from core.ts

### Line Count Summary

-   **Before Phase 3**: core.ts = 471 lines
-   **After Phase 3**: core.ts = 391 lines
-   **Reduction**: 80 lines (17% smaller)
-   **New file**: DiscoveryService.ts = 187 lines

**Total Reduction from Phase 1-3**: 156 lines removed from core.ts (28.5% reduction)

## Phase 4: Convert Runtime to Class ✅

**Date:** October 4, 2025  
**Status:** Complete

### Changes Made

1. **Created `src/core/PromptRuntime.ts`**

    - Converted the entire `createRuntime` function to a class-based architecture
    - Encapsulated all runtime logic into a cohesive `PromptRuntime` class
    - Uses dependency injection for better testability (IdGenerator, RuntimeState, DiscoveryService)
    - Provides clean public API with proper encapsulation

2. **Simplified `src/core.ts`**
    - Reduced from 391 lines to just 29 lines (92.6% reduction!)
    - Now a simple factory function that creates a PromptRuntime instance
    - Maintains backwards compatibility by returning the same API structure
    - Exports PromptRuntime class for advanced users

### Architecture Transformation

**Before (functional/closure-based):**

```typescript
export function createRuntime(ui: UI) {
  // 391 lines of closure-based code
  const idGenerator = ...
  const state = ...
  const discovery = ...

  function ask() { ... }
  function group() { ... }
  // Many nested functions and closures

  return { ask, group, ... }
}
```

**After (class-based):**

```typescript
export class PromptRuntime {
  private idGenerator: IdGenerator;
  private state: RuntimeState;
  private discovery: DiscoveryService;

  constructor(ui: UI) { ... }

  async ask<T>() { ... }
  async group() { ... }
  // Clean class methods
}

export function createRuntime(ui: UI) {
  const runtime = new PromptRuntime(ui);
  return { /* public API */ };
}
```

### Key Features

**Encapsulation:**

-   All services properly encapsulated as private properties
-   Clear separation between public API and internal methods
-   No more closure variables scattered across 400 lines

**Dependency Injection:**

-   IdGenerator, RuntimeState, DiscoveryService injected in constructor
-   Easy to test individual components
-   Clear dependency graph

**Public API:**

-   `ask()` - Execute prompt flows
-   `group()` - Create prompt groups
-   `rediscoverStaticGroupFields()` - Re-discover fields
-   `getPluginPrompts()` - Access plugin functions
-   `getStateSnapshot()` - Debug runtime state

**Advanced Features:**

-   Export `PromptRuntime` class for direct instantiation
-   `getStateSnapshot()` for debugging and inspection
-   Clean lifecycle management

### Benefits

1. **Testability** - Can instantiate and test PromptRuntime independently
2. **Maintainability** - Clear class structure easier to understand and modify
3. **Extensibility** - Easy to extend with new methods or override behavior
4. **Type Safety** - Better TypeScript support with explicit types
5. **Debugging** - `getStateSnapshot()` provides full runtime inspection
6. **Backwards Compatibility** - Existing code continues to work unchanged

### Build Status

✅ TypeScript compilation successful  
✅ No linter errors  
✅ Generated types are correct  
✅ All examples still work

### Line Count Summary

-   **Before Phase 4**: core.ts = 391 lines
-   **After Phase 4**: core.ts = 29 lines (92.6% reduction!)
-   **New file**: PromptRuntime.ts = 443 lines (well-organized class)

**Total Journey:**

-   **Original core.ts**: 547 lines
-   **Final core.ts**: 29 lines
-   **Reduction**: 518 lines (94.7% reduction!)
-   **New organized structure**: 4 clean classes (IdGenerator, RuntimeState, DiscoveryService, PromptRuntime)

## Summary of All Phases

Following the original refactoring plan:

1. ✅ **Extract `IdGenerator`** (Complete) - 107 lines
2. ✅ **Create `RuntimeState` class** (Complete) - 316 lines
3. ✅ **Create `DiscoveryService`** (Complete) - 187 lines
4. ✅ **Convert main runtime to class** (Complete) - 443 lines

### Final Architecture

```
src/core/
├── IdGenerator.ts       (107 lines) - ID generation logic
├── RuntimeState.ts      (316 lines) - State management
├── DiscoveryService.ts  (187 lines) - Field discovery
└── PromptRuntime.ts     (443 lines) - Main orchestrator

src/core.ts              (29 lines)  - Simple factory
```

### Achievements

✅ **Fully class-based architecture** - No more closures  
✅ **Separation of concerns** - Each class has one responsibility  
✅ **Testable** - All components can be unit tested  
✅ **Maintainable** - Easy to find and modify code  
✅ **Type-safe** - Excellent TypeScript support  
✅ **Backwards compatible** - Existing code unchanged  
✅ **Well-documented** - Comprehensive JSDoc comments

Each phase maintained backwards compatibility while dramatically improving code structure and maintainability.
