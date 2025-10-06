# Tasks

Executes and visualizes task lists with support for sequential, concurrent, nested, and dynamic task execution with visual progress indicators.

## Usage

```ts
import { tasks, TaskWarning } from "askeroo";

// Basic usage
const result = await tasks([
    {
        label: "Setup project",
        action: async () => {
            // Your setup logic here
        },
    },
    {
        label: "Build application",
        action: async () => {
            // Your build logic here
        },
    },
]);

// Nested tasks with concurrent execution
await tasks([
    {
        label: "Build Assets",
        concurrent: true,
        tasks: [
            {
                label: "Compile CSS",
                action: async () => {
                    /* CSS compilation */
                },
            },
            {
                label: "Compile JS",
                action: async () => {
                    /* JS compilation */
                },
            },
        ],
    },
]);

// Dynamic labels
await tasks([
    {
        label: {
            idle: "Waiting to start...",
            running: "Building project...",
            done: "Project built successfully",
            error: "Build failed",
        },
        action: async () => {
            // Build logic
        },
    },
]);

// Add tasks dynamically
const resultPromise = tasks([
    {
        label: "Initialize",
        action: async () => {
            await tasks.add({
                label: "Dynamic task",
                action: async () => {
                    console.log("Added dynamically!");
                },
            });
        },
    },
]);

// Task warnings for non-fatal issues
await tasks([
    {
        label: "Optional optimization",
        action: async () => {
            try {
                await optimizeImages();
            } catch (error) {
                throw new TaskWarning("Optimization failed, continuing...");
            }
        },
    },
]);
```

## Options

| Prop              | Type                  | Default  | Description                        |
| ----------------- | --------------------- | -------- | ---------------------------------- |
| `label`           | `string \| TaskLabel` | Required | Task description or dynamic labels |
| `action`          | `() => Promise<void>` | -        | Task function to execute           |
| `tasks`           | `Task[]`              | -        | Nested subtasks                    |
| `concurrent`      | `boolean`             | `false`  | Execute subtasks in parallel       |
| `continueOnError` | `boolean`             | `false`  | Continue execution on task failure |

## Visual Indicators

| Symbol | Status    | Color  |
| ------ | --------- | ------ |
| `□`    | Idle      | Gray   |
| `⋯`    | Running   | Blue   |
| `■`    | Completed | Green  |
| `▲`    | Warning   | Yellow |
| `✗`    | Error     | Red    |

## Types

```ts
interface Task {
    label: string | TaskLabel;
    action?: () => Promise<void>;
    tasks?: Task[];
    concurrent?: boolean;
    continueOnError?: boolean;
}

interface TaskLabel {
    idle?: string;
    running?: string;
    done?: string;
    error?: string;
}

interface TasksResult {
    success: boolean;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    warningTasks: number;
    results: TaskResult[];
}

interface TaskResult {
    id: string;
    label: string;
    status: "done" | "error" | "warning";
    error?: string;
    warning?: string;
    duration?: number;
    subtasks?: TaskResult[];
}

class TaskWarning extends Error {}
```
