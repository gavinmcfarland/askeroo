# Tasks Plugin

The Tasks plugin provides a way to execute and visualize task lists with support for sequential, concurrent, and dynamic task execution.

## Basic Usage

### `tasks(taskList)`

Execute a list of tasks with visual progress indicators.

```typescript
import { tasks } from './src/plugins/tasks/index.js';

const result = await tasks([
  {
    label: "Setup project",
    action: async () => {
      // Your setup logic here
    }
  },
  {
    label: "Build application",
    action: async () => {
      // Your build logic here
    }
  }
]);

console.log(result.success); // true if all tasks completed successfully
console.log(result.totalTasks); // Number of tasks executed
```

### `tasks.add(task)`

Add tasks dynamically during execution.

```typescript
import { tasks } from './src/plugins/tasks/index.js';

// Start with initial tasks
const resultPromise = tasks([
  {
    label: "Initialize",
    action: async () => {
      // During execution, add more tasks
      await tasks.add({
        label: "Dynamic task",
        action: async () => {
          console.log("This task was added dynamically!");
        }
      });
    }
  }
]);

const result = await resultPromise;
```

## Task Configuration

### Basic Task Structure

```typescript
interface Task {
  label: string | TaskLabel;           // Task description
  action?: () => Promise<void>;        // Task function to execute
  tasks?: Task[];                      // Nested subtasks
  concurrent?: boolean;                // Execute subtasks in parallel
  continueOnError?: boolean;           // Don't stop on task failure
}
```

### Dynamic Labels

Tasks can have different labels based on their status:

```typescript
{
  label: {
    idle: "Waiting to start...",
    running: "Building project...",
    done: "Project built successfully",
    error: "Build failed"
  },
  action: async () => {
    // Build logic
  }
}
```

### Nested Tasks

Create hierarchical task structures:

```typescript
await tasks([
  {
    label: "Setup Environment",
    tasks: [
      {
        label: "Install dependencies",
        action: async () => { /* install logic */ }
      },
      {
        label: "Configure settings",
        action: async () => { /* config logic */ }
      }
    ]
  }
]);
```

### Concurrent Execution

Execute subtasks in parallel:

```typescript
await tasks([
  {
    label: "Build Assets",
    concurrent: true, // Run subtasks in parallel
    tasks: [
      {
        label: "Compile CSS",
        action: async () => { /* CSS compilation */ }
      },
      {
        label: "Compile JS",
        action: async () => { /* JS compilation */ }
      }
    ]
  }
]);
```

## Error Handling

### Task Warnings

Use `TaskWarning` for non-fatal issues:

```typescript
import { tasks, TaskWarning } from './src/plugins/tasks/index.js';

await tasks([
  {
    label: "Optional optimization",
    action: async () => {
      try {
        // Some optimization that might fail
        await optimizeImages();
      } catch (error) {
        // Throw warning instead of failing the entire flow
        throw new TaskWarning("Image optimization failed, continuing...");
      }
    }
  }
]);
```

### Continue on Error

Allow task execution to continue even if some tasks fail:

```typescript
await tasks([
  {
    label: "Data Processing",
    continueOnError: true,
    tasks: [
      {
        label: "Process file 1",
        action: async () => { /* might fail */ }
      },
      {
        label: "Process file 2",
        action: async () => { /* will still run even if file 1 fails */ }
      }
    ]
  }
]);
```

## Task Results

The `tasks()` function returns detailed execution results:

```typescript
interface TasksResult {
  success: boolean;        // true if no tasks failed
  totalTasks: number;      // Total number of tasks executed
  completedTasks: number;  // Tasks that completed successfully
  failedTasks: number;     // Tasks that failed with errors
  warningTasks: number;    // Tasks that completed with warnings
  results: TaskResult[];   // Detailed results for each task
}

interface TaskResult {
  id: string;              // Task identifier
  label: string;           // Task label that was displayed
  status: 'done' | 'error' | 'warning';
  error?: string;          // Error message if task failed
  warning?: string;        // Warning message if task had warnings
  duration?: number;       // Task execution time (if available)
  subtasks?: TaskResult[]; // Results of any subtasks
}
```

## Visual Indicators

The plugin shows visual progress with symbols:

- `□` - Task waiting to start (idle)
- `⋯` - Task currently running
- `■` - Task completed successfully
- `▲` - Task completed with warnings
- `✗` - Task failed with error

Colors indicate status:
- Gray: idle
- Blue: running
- Green: completed
- Yellow: warning
- Red: error

## Dynamic Task Addition

Tasks can be added during execution for complex workflows:

```typescript
await tasks([
  {
    label: "Analyze project",
    action: async () => {
      const files = await getProjectFiles();

      // Add a task for each file found
      for (const file of files) {
        await tasks.add({
          label: `Process ${file.name}`,
          action: async () => {
            await processFile(file);
          }
        });
      }
    }
  }
]);
```

## Best Practices

1. **Use descriptive labels**: Make it clear what each task does
2. **Handle errors appropriately**: Use `TaskWarning` for non-critical failures
3. **Leverage concurrent execution**: Use `concurrent: true` for independent tasks
4. **Structure logically**: Group related tasks under parent tasks
5. **Provide status-specific labels**: Use different labels for different states when helpful

## Integration with Other Plugins

The tasks plugin works well with other prompt plugins:

```typescript
import { ask } from './src/core.js';
import { tasks } from './src/plugins/tasks/index.js';
import { confirm } from './src/plugins/confirm/index.js';

const result = await ask(async ({ group }) => {
  const shouldBuild = await confirm({
    message: "Build the project?"
  });

  if (shouldBuild) {
    await tasks([
      {
        label: "Building project...",
        action: async () => {
          // Build logic
        }
      }
    ]);
  }

  return { built: shouldBuild };
});
```