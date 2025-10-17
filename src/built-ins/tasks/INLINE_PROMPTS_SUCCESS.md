# Inline Prompts in Tasks ✅ WORKING!

## Success!

Prompts (`stream`, `spinner`, `note`) now render **inline** within task actions, showing detailed output while tasks execute!

## Example

```typescript
import { ask, tasks, stream } from "askeroo";

await ask(async () => {
    await tasks([
        {
            label: "Build",
            action: async () => {
                const output = await stream("Building project...");
                await output.writeLine("Cleaning dist/");
                await output.writeLine("Compiling TypeScript...");
                await output.writeLine("Bundling assets...");
                await output.complete("✓ Build complete!");
            },
        },
        {
            label: "Deploy",
            action: async () => {
                const output = await stream("Deploying...");
                await output.writeLine("Uploading to server...");
                await output.writeLine("Restarting services...");
                await output.complete("✓ Deployed!");
            },
        },
    ]);
});
```

## Output

```
■ Build
  ■ Building project...

  Cleaning dist/
  Compiling TypeScript...
  Bundling assets...
  ✓ Build complete!

■ Deploy
  ■ Deploying...

  Uploading to server...
  Restarting services...
  ✓ Deployed!
```

Note how the streams are **indented under their parent tasks** and show in real-time!

## Architecture Implementation

### 1. Tree-Based Task Nodes

Tasks are now first-class nodes in the prompt tree (like groups):

-   Each task creates a node with `type: "task"`
-   Tasks use the container plugin pattern
-   Child prompts automatically nest in the tree

### 2. Runtime Context Tracking

```typescript
// Runtime tracks which task is executing
runtime.executeTaskAction(taskId, () => {
    // Any prompts here get taskName set
    stream("Output"); // ← Gets taskName: taskId
});
```

### 3. Parent-Child Resolution

```typescript
// In PromptApp.tsx
const explicitParent = request.taskName || request.groupName || null;
// Stream with taskName becomes child of that task node
```

### 4. Rendering

`RecursiveGroupContainer` renders task nodes with their children:

```tsx
if (item.type === "task") {
    return (
        <PluginWrapper pluginType="task" {...item.properties}>
            {/* Children render here with indentation */}
            {renderedChildren}
        </PluginWrapper>
    );
}
```

## Files Modified

Core Architecture:

-   `src/core/runtime-state.ts` - Task context tracking (`enterTask`, `exitTask`)
-   `src/core/prompt-runtime.ts` - `executeTaskAction()` and `executeTaskBody()`
-   `src/core/runtime-context.ts` - RuntimeAPI includes task methods
-   `src/core/runtime-factory.ts` - Expose task methods in API
-   `src/core/ui.tsx` - `showTask()` and `clearTask()` methods
-   `src/core/prompt-tree.ts` - Task node type and `addTaskRequest()`
-   `src/types/index.ts` - Added `taskName` to `PromptRequest`, task methods to UI
-   `src/components/PromptApp.tsx` - Use `taskName` for parent resolution
-   `src/components/RecursiveGroupContainer.tsx` - Render task nodes

Task Plugin:

-   `src/built-ins/tasks/Task.tsx` - NEW: Individual task component
-   `src/built-ins/tasks/index.tsx` - Refactored to use tree-based tasks
-   `src/built-ins/tasks/types.ts` - Task types
-   `src/built-ins/tasks/Tasks.tsx` - Legacy component (can be deprecated)

## Key Features

✅ **Real-time inline rendering** - Streams appear under tasks as they execute  
✅ **ANSI color preservation** - Use `spawnWithColors()` for command colors  
✅ **Nested tasks** - Tasks can have subtasks  
✅ **Concurrent execution** - Tasks can run in parallel  
✅ **Multiple prompts per task** - Call multiple streams, spinners, notes  
✅ **Proper indentation** - Visual hierarchy matches logical structure

## Examples

-   `examples/stream-in-tasks.ts` - Full deployment pipeline
-   `examples/test-stream-in-task-debug.ts` - Simple test case
-   `examples/tasks-detailed-steps.ts` - Nested tasks pattern

## Usage Patterns

### Pattern 1: Stream for Detailed Output

```typescript
await tasks([
    {
        label: "Install packages",
        action: async () => {
            const output = await stream({
                label: "Installing dependencies...",
                maxLines: 20,
            });

            const npm = spawnWithColors("npm", ["install"]);
            npm.stdout.on("data", (data) => output.write(data.toString()));
            npm.on("close", () => output.complete("✓ Installed!"));
        },
    },
]);
```

### Pattern 2: Spinner for Progress

```typescript
await tasks([
    {
        label: "Process files",
        action: async () => {
            const spinner = await spinner("Processing 100 files...");
            await spinner.start();

            // Do work...
            for (let i = 0; i < 100; i++) {
                await processFile(i);
                await spinner.start(`Processing... (${i + 1}/100)`);
            }

            await spinner.stop("✓ All files processed!");
        },
    },
]);
```

### Pattern 3: Multiple Inline Prompts

```typescript
await tasks([
    {
        label: "Deploy",
        action: async () => {
            await note("Starting deployment...");

            const upload = await stream("Uploading files...");
            await upload.writeLine("dist/main.js");
            await upload.writeLine("dist/vendor.js");
            await upload.complete();

            const restart = await spinner("Restarting services...");
            await restart.start();
            await restartServices();
            await restart.stop("✓ Services restarted");
        },
    },
]);
```

## Breaking Changes

The task system was refactored from a self-contained component to a tree-based architecture:

### Changed:

-   Tasks are no longer managed by `task-store.ts`
-   Each task is a separate prompt node
-   `tasks.add()` now just calls `tasks()` again

### Maintained:

-   Same public API: `tasks(taskList, options)`
-   Same task options and features
-   `tasks.sequential()` and `tasks.parallel()` still work
-   `TaskWarning` class still works

## Performance Considerations

The tree-based architecture:

-   ✅ Slightly more overhead per task (creates tree node)
-   ✅ Better for tasks with child prompts (proper nesting)
-   ✅ Simpler state management (uses tree state)
-   ✅ Better debugging (visible in tree structure)

For simple task lists without inline prompts, the performance difference is negligible.
