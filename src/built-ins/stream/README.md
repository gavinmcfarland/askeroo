# Stream

A prompt for displaying streaming output from external processes or services. Perfect for showing real-time output from commands like npm install, build processes, or any streaming data.

## Usage

```typescript
import { stream } from "askeroo";
import { spawn } from "child_process";

// Create a stream with a label (optional)
const output = await stream("Installing packages...");

// Simulate npm install output
const npm = spawn("npm", ["install"]);

npm.stdout.on("data", (data) => {
    output.write(data.toString());
});

npm.stderr.on("data", (data) => {
    output.write(data.toString());
});

npm.on("close", (code) => {
    if (code === 0) {
        output.complete("Installation complete!");
    } else {
        output.error(`Installation failed with code ${code}`);
    }
});
```

## API

### `stream(label?, options?)`

Creates and returns a stream controller. This function is async.

```typescript
async function stream(
    label?: string,
    options?: StreamOptions
): Promise<StreamController>;
```

**Parameters:**

-   `label` (optional): Label shown above the output
-   `options` (optional): Configuration object
    -   `maxLines?: number` - Maximum lines to display (older lines scroll off)
    -   `hideOnCompletion?: boolean` - Hide output when complete
    -   `submitDelay?: number` - Delay in milliseconds before hiding (default: 0)
    -   `showLineNumbers?: boolean` - Show line numbers
    -   `prefixSymbol?: string` - Symbol prefix for each line

**Returns:** `Promise<StreamController>`

### Types

```typescript
interface StreamOptions {
    label?: string;
    maxLines?: number;
    hideOnCompletion?: boolean;
    submitDelay?: number;
    showLineNumbers?: boolean;
    prefixSymbol?: string;
}

interface StreamController {
    write: (text: string) => void;
    writeLine: (text: string) => Promise<void>;
    clear: () => Promise<void>;
    setLabel: (label: string) => Promise<void>;
    complete: (finalMessage?: string) => Promise<void>;
    error: (errorMessage?: string) => Promise<void>;
}
```

## Controller Methods

### `write(text: string)`

Write text to the stream. Text will be buffered until a newline is encountered.

```typescript
const output = await stream("Processing...");
output.write("Starting"); // Buffered
output.write("...\n"); // Flushes "Starting..."
```

### `writeLine(text: string)`

Write a complete line to the stream (auto-appends newline behavior).

```typescript
const output = await stream("Logs");
await output.writeLine("Line 1");
await output.writeLine("Line 2");
```

### `clear()`

Clear all output lines.

```typescript
await output.clear();
```

### `setLabel(label: string)`

Update the label dynamically.

```typescript
await output.setLabel("Installing dependencies... (50%)");
```

### `complete(finalMessage?: string)`

Mark the stream as completed (shows ✓ symbol).

```typescript
await output.complete("All done!");
```

### `error(errorMessage?: string)`

Mark the stream as errored (shows ✗ symbol).

```typescript
await output.error("Build failed!");
```

```typescript
const flow = async () => {
    // Both streams start and update simultaneously
    await streamLogs();
    await streamMetrics();

    // Continue with other prompts while both streams update
    await note("Both streams are running above...");
    const choice = await select("Choose action:", ["Continue", "Stop"]);
};
```

## Examples

### Basic Command Output

```typescript
import { stream } from "askeroo";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const output = await stream("Running build...");

try {
    const { stdout, stderr } = await execAsync("npm run build");

    if (stdout) output.write(stdout);
    if (stderr) output.write(stderr);

    await output.complete("Build successful!");
} catch (err) {
    await output.error(`Build failed: ${err.message}`);
}
```

### With Line Limit (Scrolling)

```typescript
const output = await stream("Server logs", {
    maxLines: 10, // Only show last 10 lines
    showLineNumbers: true, // Show line numbers
    prefixSymbol: "▸", // Add prefix to each line
});

// Simulate continuous logging
for (let i = 1; i <= 100; i++) {
    await output.writeLine(`Log entry ${i}`);
    await new Promise((r) => setTimeout(r, 100));
}

await output.complete();
```

### Hide After Completion

```typescript
const output = await stream("Downloading...", {
    hideOnCompletion: true, // Will disappear after completion
    submitDelay: 1000, // Show for 1 second before hiding
});

await output.writeLine("Connecting to server...");
await output.writeLine("Downloading files...");
await output.writeLine("Extracting...");
await output.complete("Download complete!");
// Will show completion message for 1 second, then hide
```

### Real-time NPM Install

```typescript
import { stream } from "askeroo";
import { spawn } from "child_process";

async function installPackages(packages: string[]) {
    const output = await stream(`Installing ${packages.join(", ")}...`, {
        maxLines: 15,
        showLineNumbers: false,
    });

    return new Promise((resolve, reject) => {
        const npm = spawn("npm", ["install", ...packages]);

        npm.stdout.on("data", (data) => {
            output.write(data.toString());
        });

        npm.stderr.on("data", (data) => {
            output.write(data.toString());
        });

        npm.on("close", (code) => {
            if (code === 0) {
                output.complete("✓ Packages installed successfully!");
                resolve(true);
            } else {
                output.error(`✗ Installation failed with code ${code}`);
                reject(new Error(`Installation failed`));
            }
        });
    });
}

// Usage
await installPackages(["axios", "lodash"]);
```

### Progress Updates

```typescript
const output = await stream("Processing files...");

const files = ["file1.txt", "file2.txt", "file3.txt"];

for (let i = 0; i < files.length; i++) {
    await output.setLabel(`Processing files... (${i + 1}/${files.length})`);
    await output.writeLine(`Processing ${files[i]}...`);

    // Simulate processing
    await new Promise((r) => setTimeout(r, 1000));

    await output.writeLine(`✓ ${files[i]} complete`);
}

await output.complete("All files processed!");
```

### Build System Output

```typescript
import { stream } from "askeroo";

async function runBuild() {
    const output = await stream("Building project...", {
        maxLines: 20,
        prefixSymbol: "│",
    });

    try {
        await output.writeLine("Cleaning output directory...");
        await output.writeLine("Compiling TypeScript...");
        await output.writeLine("  ✓ src/index.ts");
        await output.writeLine("  ✓ src/utils.ts");
        await output.writeLine("  ✓ src/types.ts");
        await output.writeLine("Bundling assets...");
        await output.writeLine("  ✓ styles.css");
        await output.writeLine("  ✓ images optimized");
        await output.writeLine("Running tests...");
        await output.writeLine("  ✓ 15 tests passed");

        await output.complete("✓ Build completed successfully!");
    } catch (err) {
        await output.error(`Build failed: ${err.message}`);
        throw err;
    }
}

await runBuild();
```

### Docker Build Output

```typescript
import { stream } from "askeroo";
import { spawn } from "child_process";

async function dockerBuild(imageName: string) {
    const output = await stream(`Building Docker image: ${imageName}`, {
        maxLines: 25,
        showLineNumbers: false,
    });

    return new Promise((resolve, reject) => {
        const docker = spawn("docker", ["build", "-t", imageName, "."]);

        docker.stdout.on("data", (data) => {
            const lines = data
                .toString()
                .split("\n")
                .filter((l) => l.trim());
            lines.forEach((line) => output.writeLine(line));
        });

        docker.stderr.on("data", (data) => {
            output.write(data.toString());
        });

        docker.on("close", (code) => {
            if (code === 0) {
                output.complete(`✓ Image ${imageName} built successfully!`);
                resolve(true);
            } else {
                output.error(`✗ Build failed with code ${code}`);
                reject(new Error("Build failed"));
            }
        });
    });
}

await dockerBuild("my-app:latest");
```

## ANSI Color Preservation

Preserve colors from commands (git, npm, ls, etc.) automatically:

```typescript
import { stream, spawnWithColors } from "askeroo";

const output = await stream("Git Status");

// Colors preserved automatically - no flags needed!
const git = spawnWithColors("git", ["status"]);

git.stdout.on("data", (data) => output.write(data.toString()));
git.on("close", () => output.complete());
```

**How it works:**

1. Uses `node-pty` if installed (best - real pseudo-TTY)
2. Falls back to environment variables (good - works for most commands)

**Optional enhancement:**

```bash
npm install node-pty --save-optional
```

📚 **Full documentation:** [COLOR_PRESERVATION.md](./COLOR_PRESERVATION.md)
