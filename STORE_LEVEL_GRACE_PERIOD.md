# Store-Level Grace Period Implementation

## Overview

Refactored the spinner's idle state optimization from a component-level `useEffect` to a store-level grace period. This provides a cleaner separation of concerns and more maintainable code.

## What Changed

### Before (Component-Level Delay)

-   Used `useEffect` in `Spinner.tsx` to delay showing the idle symbol
-   Required local state (`shouldShowSymbol`)
-   Component handled timing logic

### After (Store-Level Grace Period)

-   Grace period managed in the store state
-   Component is a pure renderer of state
-   Timing logic centralized in controller creation

## Implementation Details

### 1. Added `gracePeriodActive` to State (`types.ts`)

```typescript
export interface SpinnerState {
    status: SpinnerStatus;
    currentLabel?: string;
    currentStyle?: SpinnerStyle;
    gracePeriodActive?: boolean; // NEW
}
```

### 2. Initialize Grace Period in Store (`index.tsx`)

```typescript
// Initialize spinner as idle with grace period active
spinnerStore.update((s) => {
    s.spinners.set(spinnerId, {
        status: "idle",
        currentStyle: initialStyle,
        gracePeriodActive: true, // Initially in grace period
    });
    s.revision++;
});

// End grace period after 100ms
setTimeout(() => {
    spinnerStore.update((s) => {
        const spinner = s.spinners.get(spinnerId);
        if (spinner?.gracePeriodActive) {
            s.spinners.set(spinnerId, {
                ...spinner,
                gracePeriodActive: false,
            });
            s.revision++;
        }
    });
}, 100);
```

### 3. Clear Grace Period on State Changes (`index.tsx`)

```typescript
function updateSpinnerState(...) {
    spinnerStore.update((s) => {
        // ...
        s.spinners.set(spinnerId, {
            status,
            currentLabel: ...,
            currentStyle: ...,
            gracePeriodActive: false, // Clear grace period when state changes
        });
        // ...
    });
}
```

### 4. Simplified Component Logic (`Spinner.tsx`)

**Removed:**

-   `useEffect` for delay timing
-   `shouldShowSymbol` local state

**Added:**

```typescript
// Show symbol if: not idle, OR idle but grace period has ended
const shouldShowSymbol =
    spinnerState.status !== "idle" || !spinnerState.gracePeriodActive;
const symbol = shouldShowSymbol ? getSymbol(spinnerState.status) : " ";
```

## Benefits

### ✅ Separation of Concerns

-   Store handles timing logic
-   Component handles rendering
-   Clear responsibilities

### ✅ Simpler Component

-   No `useEffect` for timing
-   No local state management
-   Pure rendering logic

### ✅ Centralized Control

-   Grace period logic in one place (store initialization)
-   Easier to test and reason about
-   Consistent behavior

### ✅ Automatic Cleanup

-   Grace period automatically cleared on any state change
-   No edge cases with effect cleanup

## Behavior

1. **Spinner created**: Grace period starts (100ms), no idle symbol shown
2. **`start()` called within 100ms**: Transitions directly to running (no idle flash)
3. **Grace period expires**: Idle symbol appears if still idle
4. **Any state change**: Grace period cleared, symbol shows immediately

## Testing

Test with immediate start (no delay between creation and start):

```typescript
const job = await spinner("Loading");
await job.start(); // Should NOT flash idle symbol
```

Test with delayed start (allow grace period to expire):

```typescript
const job = await spinner("Loading");
await sleep(200); // Grace period expires
await job.start(); // Idle symbol will have been visible
```

## Files Modified

1. `src/built-ins/spinner/types.ts` - Added `gracePeriodActive` field
2. `src/built-ins/spinner/index.tsx` - Grace period initialization and cleanup
3. `src/built-ins/spinner/Spinner.tsx` - Simplified rendering logic
4. `src/built-ins/spinner/README.md` - Updated documentation

## Result

A cleaner, more maintainable solution that achieves the same user experience with better code organization and fewer moving parts in the component.
