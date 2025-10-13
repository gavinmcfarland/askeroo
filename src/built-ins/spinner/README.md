# Spinner

A loading spinner component with controllable states.

## Usage

```typescript
import { spinner } from "askeroo";

// Basic usage with simple label
const job = await spinner("Loading data");

// Control the spinner
job.start();
await sleep(1000);

job.pause();
await sleep(1000);

job.resume();
await sleep(1000);

job.stop();
```

## API

### `spinner(label?)`

Creates and returns a spinner controller.

**Parameters:**

-   `label` (optional): String or object with state-specific labels

**Returns:** `Promise<SpinnerController>`

### SpinnerController

The controller object has the following methods:

-   `start()` - Start the spinner animation
-   `pause()` - Pause the spinner (shows pause symbol)
-   `resume()` - Resume the spinner after pause
-   `stop()` - Stop the spinner and complete

### State-specific Labels

You can provide different labels for each state:

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

1. **idle** - Initial state, shown before `start()` is called
2. **running** - Active spinner animation
3. **paused** - Paused state, shown when `pause()` is called
4. **stopped** - Final state, shown after `stop()` is called

## Visual Indicators

-   **idle**: Gray circle ○
-   **running**: Animated spinner (⠂ - – — – -)
-   **paused**: Yellow pause symbol ‖
-   **stopped**: Green filled circle ●

## Example

```typescript
import { spinner } from "askeroo";

async function fetchData() {
    const job = await spinner({
        idle: "Preparing to fetch data",
        running: "Fetching from API...",
        paused: "Waiting for rate limit",
        stopped: "Data fetched successfully",
    });

    await sleep(500); // Show idle state

    job.start();
    // Simulate API call
    await sleep(2000);

    // Simulate rate limiting
    job.pause();
    await sleep(1000);

    job.resume();
    await sleep(1000);

    job.stop();
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
```
