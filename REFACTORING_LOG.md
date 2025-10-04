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

## Next Steps

Following the original refactoring plan:

1. ✅ **Extract `IdGenerator`** (Complete)
2. ✅ **Create `RuntimeState` class** (Complete)
3. ✅ **Create `DiscoveryService`** (Complete)
4. ⏳ **Convert main runtime to class** - Final architectural improvement

Each phase maintains backwards compatibility while improving code structure.
