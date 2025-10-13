# Spinner Component Implementation

## Overview

A new spinner component has been created based on the tasks prompt pattern. The spinner provides a loading indicator with controllable states (idle, running, paused, stopped).

## Files Created

### Core Files

1. **src/built-ins/spinner/types.ts**

    - Type definitions for spinner options, states, and controller

2. **src/built-ins/spinner/spinner-store.ts**

    - Store for managing spinner state using the reactive store pattern
    - Follows the same pattern as task-store.ts

3. **src/built-ins/spinner/Spinner.tsx**

    - React component that displays the spinner
    - Handles animation, state visualization, and auto-submission

4. **src/built-ins/spinner/index.tsx**

    - Public API and controller implementation
    - Exports the `spinner()` function and types

5. **src/built-ins/spinner/README.md**
    - Documentation and usage examples

### Example Files

1. **examples/spinner-example.ts**

    - Comprehensive example showing all spinner features
    - Three examples demonstrating different use cases

2. **examples/spinner-simple.ts**
    - Simple example showing basic usage

## API

### Main Function

```typescript
async function spinner(
    label?: string | SpinnerLabel
): Promise<SpinnerController>;
```

### Controller Interface

```typescript
interface SpinnerController {
    start: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
}
```

### Usage Example

```typescript
import { ask, spinner } from "askeroo";

const flow = async () => {
    const job = await spinner("Loading data");

    await sleep(800);
    job.start();

    await sleep(800);
    job.pause();

    await sleep(800);
    job.resume();

    await sleep(800);
    job.stop();

    return "Done!";
};

await ask(flow);
```

### State-Specific Labels

```typescript
const job = await spinner({
    idle: "Ready to load",
    running: "Loading data...",
    paused: "Paused",
    stopped: "Complete!",
});
```

## States

The spinner has four states:

1. **idle** - Initial state before `start()` is called

    - Symbol: Gray circle ○
    - Color: gray

2. **running** - Active spinner animation

    - Symbol: Animated (⠂ - – — – -)
    - Color: blue
    - Animation speed: 150ms per frame

3. **paused** - Paused state when `pause()` is called

    - Symbol: Yellow pause bars ‖
    - Color: yellow

4. **stopped** - Final state after `stop()` is called
    - Symbol: Green filled circle ●
    - Color: green
    - Auto-submits after 100ms

## Implementation Details

### State Management

-   Uses the reactive store pattern from `createStore()`
-   Each spinner has a unique ID shared between controller and component
-   State updates trigger re-renders automatically

### Component Lifecycle

1. User calls `spinner()` function
2. Unique spinner ID is generated
3. Initial "idle" state is set in store
4. Prompt component is rendered
5. Controller is returned to user
6. User controls spinner via controller methods
7. When `stop()` is called, component auto-submits

### Key Design Decisions

1. **Shared ID Pattern**: The spinner ID is passed through options to ensure the controller and component reference the same spinner instance

2. **Idle State**: Following the tasks pattern, spinner starts in idle state and shows an empty/waiting indicator before `start()` is called

3. **Auto-submission**: When `stop()` is called, the component automatically submits after a brief delay, completing the prompt

4. **Store-based State**: Uses reactive store for state management, consistent with other built-in components

5. **Input Blocking**: Blocks input during running state to prevent escape sequences from showing

## Integration

The spinner is fully integrated into the askeroo system:

-   Exported from main `src/index.ts`
-   Auto-registers as a prompt type
-   Works within `ask()` flows
-   Follows the same patterns as other built-in components

## Testing

To test the spinner in an interactive terminal:

```bash
npm run build
node dist/examples/spinner-simple.js
```

Note: The spinner requires an interactive TTY to display properly. Running in non-interactive environments will show a "Raw mode is not supported" error, which is expected behavior for Ink-based components.

## Comparison with Tasks

The spinner follows the same architectural patterns as the tasks component:

| Feature            | Tasks                              | Spinner                     |
| ------------------ | ---------------------------------- | --------------------------- |
| Store pattern      | ✓                                  | ✓                           |
| Idle state         | ✓                                  | ✓                           |
| Auto-submission    | ✓                                  | ✓                           |
| Reactive updates   | ✓                                  | ✓                           |
| Animated indicator | ✓                                  | ✓                           |
| External control   | tasks.add()                        | controller methods          |
| State types        | idle/running/success/error/warning | idle/running/paused/stopped |

## Future Enhancements

Potential improvements that could be added:

1. Custom spinner frame sequences
2. Progress percentage display
3. Elapsed time display
4. Multiple spinners running simultaneously
5. Success/error states like tasks
6. Custom colors per state
