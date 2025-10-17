# Color Preservation in Stream

When streaming output from commands like `git status`, `ls`, or `npm install`, you want to preserve the ANSI colors that make the output readable (like git's red for modified files).

## The Problem

By default, commands detect they're not outputting to a real terminal (TTY) and disable colors:

```typescript
// ❌ No colors - command detects it's not a TTY
const git = spawn("git", ["status"]);
```

## The Solution: `spawnWithColors()`

Use `spawnWithColors()` instead of regular `spawn()` to automatically preserve colors:

```typescript
import { stream, spawnWithColors } from "askeroo";

const output = await stream("Git Status");

// ✅ Colors preserved automatically!
const git = spawnWithColors("git", ["status"]);

git.stdout.on("data", (data) => output.write(data.toString()));
git.on("close", (code) => output.complete("Done!"));
```

## How It Works

`spawnWithColors()` uses a two-tier approach:

### 1. **Best: Real Pseudo-TTY** (requires `node-pty`)

If `node-pty` is installed, it creates a real pseudo-terminal that tricks commands into thinking they're in an actual terminal:

```bash
npm install node-pty --save-optional
```

**Pros:**

-   Works with ALL commands
-   Perfect color support
-   Commands behave exactly as in a real terminal

**Cons:**

-   Requires native compilation (needs build tools)
-   Optional dependency

### 2. **Good: Environment Variables** (fallback)

If `node-pty` isn't available, it sets environment variables that most commands respect:

```typescript
{
  FORCE_COLOR: "1",
  CLICOLOR_FORCE: "1",
  npm_config_color: "always",
  // ... and more
}
```

**Pros:**

-   No dependencies
-   Works with most popular commands

**Cons:**

-   Some commands might not respect these
-   May need command-specific flags for full support

## Works With

✅ **Git**: status, diff, log  
✅ **npm/yarn/pnpm**: install, list  
✅ **ls/grep**: with color flags  
✅ **pytest**: test output  
✅ **cargo**: Rust build output  
✅ **Most modern CLI tools**

## Examples

### Git Status

```typescript
const output = await stream("Git Status");
const git = spawnWithColors("git", ["status"]);

git.stdout.on("data", (data) => output.write(data.toString()));
git.on("close", () => output.complete());
```

### npm Install

```typescript
const output = await stream("Installing packages...");
const npm = spawnWithColors("npm", ["install", "axios"]);

npm.stdout.on("data", (data) => output.write(data.toString()));
npm.stderr.on("data", (data) => output.write(data.toString()));
npm.on("close", (code) => {
    if (code === 0) output.complete("✓ Installed!");
    else output.error("✗ Failed!");
});
```

### ls with Colors

```typescript
const output = await stream("Directory Listing");
const isMac = process.platform === "darwin";
const args = isMac ? ["-lahG"] : ["-lah", "--color=always"];

const ls = spawnWithColors("ls", args);
ls.stdout.on("data", (data) => output.write(data.toString()));
ls.on("close", () => output.complete());
```

## API

### `spawnWithColors(command, args, options)`

**Parameters:**

-   `command: string` - Command to run
-   `args: string[]` - Command arguments (optional)
-   `options: object` - Spawn options (optional)

**Returns:** `ColoredSpawnResult`

-   `stdout: NodeJS.ReadableStream` - Standard output stream
-   `stderr: NodeJS.ReadableStream` - Standard error stream
-   `pid?: number` - Process ID
-   Events: `close`, `error`, `exit`

**Options:**

-   `cwd: string` - Working directory
-   `env: object` - Environment variables
-   All standard `spawn` options

## Manual Color Flags

If you need more control or `spawnWithColors()` doesn't work for a specific command, use command-specific flags:

```typescript
// Git
spawn("git", ["-c", "color.status=always", "status"]);

// ls (Linux)
spawn("ls", ["--color=always"]);

// grep
spawn("grep", ["--color=always", "pattern", "file"]);

// npm
spawn("npm", ["install"], {
    env: { ...process.env, npm_config_color: "always" },
});
```

## Why Not Use Ink's `useStdout()`?

Ink's `useStdout()` hook controls where Ink renders its output, but it doesn't affect how child processes detect TTY. Child processes still see they're not connected to a real terminal, so they disable colors regardless of where Ink renders.

`spawnWithColors()` solves this at the child process level.

## Troubleshooting

### Colors still not showing?

1. **Install node-pty** (best solution):

    ```bash
    npm install node-pty --save-optional
    ```

2. **Use command-specific flags**:

    ```typescript
    spawnWithColors("git", ["-c", "color.status=always", "status"]);
    ```

3. **Check the command supports colors**:
    ```bash
    # Test if command respects FORCE_COLOR
    FORCE_COLOR=1 your-command
    ```

### Build errors with node-pty?

Make sure you have build tools:

-   **macOS**: `xcode-select --install`
-   **Linux**: `apt-get install build-essential`
-   **Windows**: Install Visual Studio Build Tools

Or use without `node-pty` - the fallback works for most commands!

## See Also

-   [examples/stream-with-colors.ts](../../../examples/stream-with-colors.ts) - Working examples
-   [examples/stream-real-command.ts](../../../examples/stream-real-command.ts) - Basic command streaming
