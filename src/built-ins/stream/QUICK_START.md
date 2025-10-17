# Stream Prompt - Quick Start

The `stream` prompt allows you to display real-time output from external processes, commands, or any streaming data source.

## Basic Usage

```typescript
import { ask, stream } from "askeroo";

const flow = async () => {
    // With a label
    const output = await stream("Processing...");
    await output.writeLine("Line 1");
    await output.complete("Done!");

    // Without a label
    const output2 = await stream();
    await output2.writeLine("No label needed");
    await output2.complete();
};

await ask(flow);
```

## API Variations

```typescript
// 1. Label only
await stream("Installing...");

// 2. Label with options
await stream("Installing...", {
    maxLines: 20,
    showLineNumbers: true,
});

// 3. Options only (no label) - use undefined
await stream(undefined, {
    maxLines: 20,
    prefixSymbol: "▸",
});

// 4. Options object (with or without label)
await stream({
    label: "Installing...", // optional
    maxLines: 20,
    showLineNumbers: true,
});
```

## Real-World Example: NPM Install

```typescript
import { ask, stream } from "askeroo";
import { spawn } from "child_process";

const flow = async () => {
    const output = await stream("Installing packages...", {
        maxLines: 20, // Show only last 20 lines
    });

    const npm = spawn("npm", ["install", "axios", "lodash"]);

    npm.stdout.on("data", (data) => {
        output.write(data.toString());
    });

    npm.stderr.on("data", (data) => {
        output.write(data.toString());
    });

    npm.on("close", (code) => {
        if (code === 0) {
            output.complete("✓ Installation complete!");
        } else {
            output.error(`✗ Failed with code ${code}`);
        }
    });
};

await ask(flow);
```

## Key Features

-   **Real-time streaming**: Display output as it arrives
-   **Line buffering**: Automatic buffering until newlines
-   **Scrolling**: Set `maxLines` to show only recent output
-   **Line numbers**: Optional line numbering
-   **Prefix symbols**: Add visual indicators
-   **Status symbols**: Automatic status indicators (animated spinner for active, ■ complete, ✗ error)

## Controller Methods

| Method            | Description                        |
| ----------------- | ---------------------------------- |
| `write(text)`     | Write text (buffers until newline) |
| `writeLine(text)` | Write a complete line              |
| `clear()`         | Clear all output                   |
| `setLabel(label)` | Update the label                   |
| `complete(msg?)`  | Mark as complete (green ■)         |
| `error(msg?)`     | Mark as error (red ✗)              |

## Options

```typescript
{
  label?: string;              // Label above output
  maxLines?: number;           // Max lines (scrolling)
  hideOnCompletion?: boolean;  // Hide when done
  submitDelay?: number;        // Delay before hiding
  showLineNumbers?: boolean;   // Show line numbers
  prefixSymbol?: string;       // Prefix for each line
}
```

## Examples

See the `examples/` directory:

-   `stream-example.ts` - Various streaming scenarios
-   `stream-real-command.ts` - Real shell commands
-   `stream-npm-install.ts` - NPM install example
