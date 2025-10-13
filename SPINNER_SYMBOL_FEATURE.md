# Spinner Symbol Customization Feature

## Summary

Added the ability to customize spinner symbols through a new `symbol` option. Users can now:

1. Use a simple string to replace the default running animation
2. Define different symbols for each state (idle, running, paused, stopped)
3. Create custom animations using an array of symbols
4. Change symbols dynamically through the style parameter

## Changes Made

### 1. Type Definitions (`src/built-ins/spinner/types.ts`)

-   Added `SpinnerSymbol` interface with support for state-specific symbols
-   Updated `SpinnerStyle` to include optional `symbol` property
-   Updated `SpinnerOptions` to include optional `symbol` property
-   Updated `SpinnerState` to track `currentSymbol`

### 2. Component Logic (`src/built-ins/spinner/Spinner.tsx`)

-   Updated `getSymbol()` function to check for custom symbols
-   Added support for string symbols (replaces running state only)
-   Added support for object symbols (state-specific)
-   Added support for array symbols (animated sequences)
-   Custom symbols fall back to defaults if not specified for a state

### 3. Controller API (`src/built-ins/spinner/index.tsx`)

-   Updated `updateSpinnerState()` to handle symbol updates from style
-   Updated `spinner()` function to initialize with custom symbols
-   Symbol updates are merged with existing styles (not replaced)
-   Symbols can be changed dynamically via controller methods

### 4. Exports (`src/index.ts`)

-   Added `SpinnerSymbol` type export for TypeScript users

### 5. Documentation (`src/built-ins/spinner/README.md`)

-   Added comprehensive section on custom symbols
-   Included examples for all symbol use cases
-   Updated API reference to include symbol option

### 6. Examples

Created two example files:

-   `examples/spinner-custom-symbol.ts` - Comprehensive examples of all features
-   `examples/spinner-symbol-simple.ts` - Simple quick test example

## Usage Examples

### Simple String Symbol

```typescript
const job = await spinner("Loading...", { symbol: "🔄" });
```

### State-specific Symbols

```typescript
const job = await spinner("Processing...", {
    symbol: {
        idle: "⚪",
        running: "🔵",
        paused: "🟡",
        stopped: "🟢",
    },
});
```

### Animated Symbols (Array)

```typescript
const job = await spinner("Syncing...", {
    symbol: {
        running: ["◐", "◓", "◑", "◒"],
        stopped: "✓",
    },
});
```

### Dynamic Symbol Changes

```typescript
const job = await spinner("Downloading...", { symbol: "⬇️" });
await job.start();
await job.start("Uploading...", { symbol: "⬆️" });
await job.stop("Complete!", { symbol: "✔️" });
```

## Technical Details

-   Symbol option can be a string, object, or include arrays for animations
-   When a simple string is provided, it applies to all states (useful for dynamic changes)
-   When an object is provided, you can specify different symbols per state
-   Array symbols animate by cycling through array indices using modulo
-   Symbols merge with existing styles (only specify what changes)
-   Falls back to default symbols if not specified
-   Fully type-safe with TypeScript support

## Testing

-   All code compiles without errors
-   Type exports are correctly defined
-   Examples demonstrate all use cases
-   No linter errors

## Backward Compatibility

This is a purely additive feature:

-   No existing APIs were changed
-   Default behavior remains unchanged
-   All existing code continues to work as before
