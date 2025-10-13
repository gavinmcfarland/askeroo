# Spinner

A loading spinner component with controllable states, dynamic text updates, and customizable styling.

## Quick Start

```typescript
import { ask, spinner } from "askeroo";

const flow = async () => {
    const job = await spinner("Loading data");

    await job.start();
    await sleep(2000);

    await job.stop();

    return "Done!";
};

await ask(flow);
```

## API

### `spinner(label?, style?)`

Creates and returns a spinner controller.

**Parameters:**

-   `label` (optional): String or object with state-specific labels
-   `style` (optional): Style object with color, bgColor, and dim properties

**Returns:** `Promise<SpinnerController>`

### SpinnerController

All controller methods are async and should be awaited:

```typescript
interface SpinnerController {
    start: (text?: string, style?: SpinnerStyle) => Promise<void>;
    pause: (text?: string, style?: SpinnerStyle) => Promise<void>;
    resume: (text?: string, style?: SpinnerStyle) => Promise<void>;
    stop: (text?: string, style?: SpinnerStyle) => Promise<void>;
}
```

-   `start(text?, style?)` - Start the spinner animation
-   `pause(text?, style?)` - Pause the spinner
-   `resume(text?, style?)` - Resume the spinner after pause
-   `stop(text?, style?)` - Stop the spinner and complete (waits for prompt to finish)

## States

The spinner has four states:

1. **idle** - Initial state, shown before `start()` is called
2. **running** - Active spinner animation
3. **paused** - Paused state
4. **stopped** - Final state, auto-completes the prompt

## Visual Indicators

-   **idle**: Empty square □
-   **running**: Animated spinner (⠂ - – — – -)
-   **paused**: Filled circle ●
-   **stopped**: Filled square ■

## Features

### 1. State-specific Labels

Define different labels for each state:

```typescript
const job = await spinner({
    idle: "Ready to load",
    running: "Loading data...",
    paused: "Paused",
    stopped: "Complete!",
});
```

### 2. Dynamic Text Updates

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

### 3. Styling with Chalk

Apply colors, backgrounds, and dimming:

```typescript
// Set initial style
const job = await spinner("Processing...", {
    color: "cyan",
    dim: false,
});

// Change style dynamically
await job.start("Running...", { color: "yellow" });
await job.stop("Complete!", { color: "green" });
```

**SpinnerStyle Interface:**

```typescript
interface SpinnerStyle {
    color?: string; // Any chalk color: "red", "blue", "green", "cyan", etc.
    bgColor?: string; // Background: "red", "blue", "yellow", etc.
    dim?: boolean; // Makes text dimmer
}
```

**Available Colors:**

-   Basic: `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray`
-   Bright: `redBright`, `greenBright`, `blueBright`, etc.

### 4. Style Merging

Styles are merged, not replaced - only specify what changes:

```typescript
const job = await spinner("Task", {
    color: "red",
    dim: true,
});

// Only change dim, keeps red color
await job.start("Starting", { dim: false });

// Add background, keeps color and dim
await job.pause("Paused", { bgColor: "yellow" });

// Change color, keeps bgColor and dim
await job.resume("Resuming", { color: "green" });
```

### 5. Idle State Optimization

If you start the spinner immediately (within 100ms), the idle state won't briefly flash:

```typescript
const job = await spinner("Loading");
await job.start(); // Goes straight to running, no idle flash
```

## Complete Examples

### Basic Usage

```typescript
import { ask, spinner } from "askeroo";

const flow = async () => {
    const job = await spinner("Loading data");

    await sleep(800);
    await job.start();

    await sleep(800);
    await job.pause();

    await sleep(800);
    await job.resume();

    await sleep(800);
    await job.stop();

    return "Done!";
};

await ask(flow);
```

### With Dynamic Text and Styling

```typescript
import { ask, spinner } from "askeroo";

const flow = async () => {
    const job = await spinner("Preparing deployment...", {
        color: "blue",
        dim: true,
    });

    await sleep(1000);
    await job.start("Building application...", { dim: false });

    await sleep(3000);
    await job.pause("Waiting for confirmation...", {
        color: "yellow",
    });

    await sleep(2000);
    await job.resume("Deploying to production...", {
        color: "cyan",
    });

    await sleep(3000);
    await job.stop("Deployment successful!", {
        color: "green",
    });

    return "Deployed!";
};

await ask(flow);
```

### Multiple Sequential Spinners

```typescript
const flow = async () => {
    // First spinner
    const download = await spinner("Downloading...", { color: "cyan" });
    await download.start();
    await sleep(2000);
    await download.stop("Downloaded!", { color: "green" });

    // Second spinner
    const install = await spinner("Installing...", { color: "blue" });
    await install.start();
    await sleep(2000);
    await install.stop("Installed!", { color: "green" });

    return "Complete!";
};
```

## Best Practices

1. **Always await controller methods** - All methods are async
2. **Use `stop()` to complete** - This properly closes the prompt
3. **Set base styles once** - Use style merging for updates
4. **Meaningful text updates** - Keep users informed of progress
5. **Use colors semantically** - Green for success, yellow for warnings, red for errors

## Helper Function

```typescript
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
```
