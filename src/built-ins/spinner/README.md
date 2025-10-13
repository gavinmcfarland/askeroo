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

### `spinner(label?, options?)`

Creates and returns a spinner controller.

**Parameters:**

-   `label` (optional): String or object with state-specific labels
-   `options` (optional): Configuration object with styling and behavior options
    -   `color` - Text color (any chalk color)
    -   `bgColor` - Background color
    -   `dim` - Make text dimmer
    -   `hideOnCompletion` - Hide spinner after completion
    -   `submitDelay` - Delay in milliseconds before auto-submitting after stop (default: 0)
    -   `symbol` - Custom symbol(s) for spinner states (string, object, or animated array)

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

Default symbols:

-   **idle**: Empty square □
-   **running**: Animated spinner (⠂ - – — – -)
-   **paused**: Filled circle ●
-   **stopped**: Filled square ■

You can customize these symbols using the `symbol` option (see Custom Symbols section below).

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

Apply colors, backgrounds, and dimming through the options object:

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

**Available Style Options:**

-   `color` - Any chalk color: "red", "blue", "green", "cyan", etc.
-   `bgColor` - Background: "red", "blue", "yellow", etc.
-   `dim` - Makes text dimmer (boolean)

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

If you start the spinner immediately (within 100ms), the idle symbol won't briefly flash:

```typescript
const job = await spinner("Loading");
await job.start(); // Symbol goes straight to running animation, no idle symbol flash
```

**Note:** The spinner uses a store-level grace period to prevent symbol flicker. During this grace period (100ms after creation), the idle symbol is hidden. If `start()` is called during this time, the spinner transitions directly to the running animation without showing the idle symbol. The text appears immediately, providing instant feedback to users while avoiding visual flicker.

### 6. Hide on Completion

Hide the spinner after it completes, like other prompts:

```typescript
const job = await spinner("Downloading...", {
    color: "cyan",
    hideOnCompletion: true,
});

await job.start();
await sleep(2000);
await job.stop(); // Spinner disappears immediately (skips stopped state)
```

**Note:** When `hideOnCompletion` is `true` and no `submitDelay` is set (or is 0), the spinner will disappear immediately without showing the stopped state. This avoids a brief flash of the completion message.

If you want to show the stopped state briefly before hiding, combine with `submitDelay`:

```typescript
const job = await spinner("Downloading...", {
    color: "cyan",
    hideOnCompletion: true,
    submitDelay: 1500, // Show stopped state for 1.5 seconds
});

await job.stop("Downloaded!"); // Shows "Downloaded!" for 1.5s, then hides
```

This is useful for temporary status indicators that don't need to remain visible after completion.

### 7. Submit Delay

Add a delay before the spinner auto-submits, allowing users to see the final message:

```typescript
const job = await spinner("Processing...", {
    color: "cyan",
    submitDelay: 1500, // Wait 1.5 seconds after stopping
});

await job.start();
await sleep(2000);
await job.stop("Success!", { color: "green" });
// "Success!" message visible for 1.5 seconds before continuing
```

This is useful for showing success/completion messages that users should see before moving on.

### 8. Custom Symbols

Customize the spinner symbols to match your brand or preference:

#### Simple String Symbol

Replace just the running animation with a single symbol:

```typescript
const job = await spinner("Loading...", {
    symbol: "🔄",
});

await job.start();
// Shows: 🔄 Loading...
```

#### State-specific Symbols

Define different symbols for each state:

```typescript
const job = await spinner("Processing...", {
    symbol: {
        idle: "⚪",
        running: "🔵",
        paused: "🟡",
        stopped: "🟢",
    },
});

await job.start(); // Shows: 🔵 Processing...
await job.pause(); // Shows: 🟡 Processing...
await job.resume(); // Shows: 🔵 Processing...
await job.stop(); // Shows: 🟢 Processing...
```

#### Animated Symbols

Create custom animations using an array:

```typescript
const job = await spinner("Syncing...", {
    symbol: {
        running: ["◐", "◓", "◑", "◒"],
        stopped: "✓",
    },
});

await job.start();
// Animates through: ◐ → ◓ → ◑ → ◒ → ◐ ...
```

#### Dynamic Symbol Changes

Change symbols on the fly through the style parameter:

```typescript
const job = await spinner("Downloading...", {
    symbol: "⬇️",
});

await job.start();
await sleep(2000);

await job.start("Uploading...", { symbol: "⬆️" });
await sleep(2000);

await job.stop("Transfer complete!", { symbol: "✔️" });
```

**Symbol Options:**

-   **String**: Uses the same symbol for all states (useful for dynamic changes)
-   **Object**: Define different symbols for each state (`idle`, `running`, `paused`, `stopped`)
-   **Array** (for `running` state in object): Creates an animated sequence
-   Symbols merge with existing styles - specify only what changes

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
        submitDelay: 2000, // Show final message for 2 seconds
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
    // Success message visible for 2 seconds

    return "Deployed!";
};

await ask(flow);
```

### Multiple Sequential Spinners

```typescript
const flow = async () => {
    // First spinner - hides when complete
    const download = await spinner("Downloading...", {
        color: "cyan",
        hideOnCompletion: true,
    });
    await download.start();
    await sleep(2000);
    await download.stop("Downloaded!", { color: "green" });

    // Second spinner - stays visible
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
6. **Use `hideOnCompletion` for temporary status** - Hide spinners that don't need to remain visible
7. **Use `submitDelay` for important messages** - Give users time to read completion messages

## Helper Function

```typescript
function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
```
