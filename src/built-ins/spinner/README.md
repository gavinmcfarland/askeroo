# Spinner

A loading spinner component with controllable states, dynamic text updates, and customizable styling.

## Example

```typescript
import { ask, spinner } from "askeroo";

const flow = async () => {
    const job = await spinner("Loading data");

    await job.start();

    await sleep(2000);

    await job.stop();
};

await ask(flow);
```

## API

### `spinner(label?, options?)`

Creates and returns a spinner controller. This function is async.

```typescript
async function spinner(
    label?: string | SpinnerLabel,
    options?: SpinnerOptions
): Promise<SpinnerController>;
```

**Parameters:**

-   `label` (optional): String or `SpinnerLabel` object with state-specific labels
-   `options` (optional): Configuration object
    -   `hideOnCompletion?: boolean` - Hide spinner after completion
    -   `submitDelay?: number` - Delay in milliseconds before auto-submitting after stop (default: 0)
    -   `style?: SpinnerStyle` - Style configuration object
        -   `color?: string` - Text color (any chalk color)
        -   `bgColor?: string` - Background color
        -   `dim?: boolean` - Make text dimmer
        -   `symbol?: string | SpinnerSymbol` - Custom symbol(s) for spinner states

**Returns:** `Promise<SpinnerController>`

### Types

```typescript
interface SpinnerLabel {
    idle?: string;
    running?: string;
    paused?: string;
    stopped?: string;
}

interface SpinnerSymbol {
    idle?: string;
    running?: string | string[]; // Can be array for animation
    paused?: string;
    stopped?: string;
}

interface SpinnerStyle {
    color?: string;
    bgColor?: string;
    dim?: boolean;
    symbol?: string | SpinnerSymbol;
}

interface SpinnerOptions {
    label?: string | SpinnerLabel;
    hideOnCompletion?: boolean;
    submitDelay?: number;
    style?: SpinnerStyle;
}

interface SpinnerController {
    start: (text?: string, style?: SpinnerStyle) => Promise<void>;
    pause: (text?: string, style?: SpinnerStyle) => Promise<void>;
    resume: (text?: string, style?: SpinnerStyle) => Promise<void>;
    stop: (text?: string, style?: SpinnerStyle) => Promise<void>;
}
```

**Controller Methods:**

All controller methods are async and should be awaited. Each method accepts optional `text` and `style` parameters to update the spinner's display:

-   `start(text?, style?)` - Start the spinner animation. Style properties (`color`, `bgColor`, `dim`, `symbol`) can be passed to update the appearance
-   `pause(text?, style?)` - Pause the spinner with optional text/style updates
-   `resume(text?, style?)` - Resume the spinner after pause with optional text/style updates
-   `stop(text?, style?)` - Stop the spinner and complete (waits for prompt to finish) with optional text/style updates

## States

The spinner has four states:

1. **idle** - Initial state, shown before `start()` is called
2. **running** - Active spinner animation
3. **paused** - Paused state
4. **stopped** - Final state, auto-completes the prompt

## Features

### State-specific Labels

Define different labels for each state:

```typescript
const job = await spinner({
    idle: "Ready to load",
    running: "Loading data...",
    paused: "Paused",
    stopped: "Complete!",
});
```

### Dynamic Text Updates

Update text when changing states:

```typescript
const job = await spinner("Preparing...");

await job.start("Connecting to server...");
await sleep(2000);

await job.pause("Connection paused");
await sleep(1000);

await job.resume("Resuming connection...");
await sleep(2000);

await job.stop("Connection established!");
```

### Animated Symbols

Create custom animations using an array:

```typescript
const job = await spinner("Syncing...", {
    style: {
        symbol: {
            running: ["◐", "◓", "◑", "◒"],
            stopped: "✓",
        },
    },
});

await job.start();
// Animates through: ◐ → ◓ → ◑ → ◒ → ◐ ...
```

## Best Practices

1. **Always await controller methods** - All methods are async
2. **Use `stop()` to complete** - This properly closes the prompt
3. **Set base styles once** - Use style merging for updates
4. **Meaningful text updates** - Keep users informed of progress
5. **Use colors semantically** - Green for success, yellow for warnings, red for errors
6. **Use `hideOnCompletion` for temporary status** - Hide spinners that don't need to remain visible
7. **Use `submitDelay` for important messages** - Give users time to read completion messages
