# Askeroo

A modern CLI prompt library with flow control, back navigation, and conditional fields using Ink.

## Features

-   Works great out of the box, with key prompts, like text, radio, multi.
-   Create your own bespoke prompts using a highly flexible framework
-   Stateful navigation that preserves user's inputs
-   Return structured data your way with imperative-style functions
-   Write dynamic branching with conditionals fields
-   Rich markdown support with md template literals for formatted labels and content

## Installation

```bash
npm i askeroo
```

## Quick Start

```typescript
import { ask, group, text, confirm } from "askeroo/core";

const flow = async () => {
    // Group 1: Profile
    const profile = await group(
        async () => {
            const first = await text({ message: "First name" });
            const last = await text({ message: "Last name" });
            return { first, last };
        },
        { message: "Profile" }
    );

    // Group 2: Preferences (with conditional)
    const prefs = await group(
        async () => {
            const role = await text({ message: "Role (user/admin)" });
            if (role === "admin") {
                const code = await text({ message: "Access code" });
                return { role, code };
            }
            const news = await confirm({ message: "Subscribe to newsletter?" });
            return { role, news };
        },
        { message: "Preferences" }
    );

    return { profile, prefs };
};

const result = await ask(flow);
console.log(result);
```

## API Reference

-   ### Run prompt flows

    **`ask(flow: FlowFunction, options: FlowOpts): Promise<T>`**

    Executes a prompt flow with replay and navigation support.

    ```ts
    const result = await ask(async () => {
        const name = await text({
            message: "Name",
        });
        return { name };
    });
    ```

    **Options**

    ```ts
    interface FlowOpts {
        allowBack?: boolean;
    }
    ```

-   ### Group prompts

    **`group(flow: () => Promise<T>, options: GroupOpts): Promise<T>`**

    Group prompts visually and control their behaviour together.

    **Options**

    ```ts
    interface GroupOpts {
        label?: string;
        flow?: "progressive" | "phased" | "static";
        allowBack?: boolean;
        arrowNavigation?: boolean;
    }
    ```

    -   **allowBack:** (default true) - allow user to go back
    -   **flow:** (default progressive) - change the behaviour of how prompts appear in a group.
        -   **Progressive:** fields are progressively revealed as the user answers them.
        -   **Phased:** only one is visible at a time.
        -   **Static:** all fields are visible at the same time.
    -   **arrowNavigation:** (default false) only applicable to static groups. If true allows users to navigate up and down.
    -   **statePersistence:** 'remember', 'persist', 'none'

## Prompts

-   ### `text(options: TextOpts)`

    Show a text input.

    **Options**

    ```ts
    interface TextOpts {
        label: string;
        shortLabel?: string;
        initialValue?: string;
        placeholder?: string;
        required?: boolean;
    }
    ```

-   ### `confirm(options: ConfirmOpts)`

    Show a confirmation with choice of yes or no.

    **Options**

    ```ts
    interface ConfirmOpts {
        label?: string;
        shortLabel?: string;
        allowLoop?: boolean;
        options?: AtLeastTwo<{ value: any; label: string }>[];
    }
    ```

-   ### `radio(options: RadioOpts)`

    Show a single-choice selection from multiple options.

    ```ts
    interface RadioOpts {
        label?: string;
        shortLabel?: string;
        allowLoop?: boolean;
        searchable: boolean;
        options: Array<{ value: string; label: string }>;
        initialValue?: string;
    }
    ```

-   ### `multi(options: MultiOpts)`

    Show a multi-choice selection allowing multiple options.

    ```ts
    interface MultiOpts {
        label?: string;
        shortLabel?: string;
        allowLoop?: boolean;
        searchable: boolean;
        options: Array<{ value: string; label: string }>;
        initialValue?: string[];
        noneOption?: { label: string };
        otherOption?: { label: string };
    }
    ```

-   ### `note(MarkdownString)`

    Show a note using markdown.

-   ### `component(options: ComponentOpts)`

    Render a React component using Ink.

    ```ts
    interface ComponentOpts {
        component: ReactComponent;
    }
    ```

-   ### `tasks(taskList: Task[], options?: TasksOpts)`

    Execute a list of tasks with progress indication and error handling.

    ```ts
    interface Task {
        label: string | TaskLabel;
        action?: () => Promise<void>;
        tasks?: Task[]; // Nested subtasks
        concurrent?: boolean;
        continueOnError?: boolean;
        completeOn?: "children" | "self" | "either";
    }

    interface TaskLabel {
        idle?: string;
        running?: string;
        done?: string;
        error?: string;
    }

    interface TasksOpts {
        concurrent?: boolean; // true = parallel (default), false = sequential
    }

    interface TasksResult {
        success: boolean;
        totalTasks: number;
        completedTasks: number;
        failedTasks: number;
        warningTasks: number;
        results: TaskResult[];
    }
    ```

    **Usage**

    ```ts
    // Basic task execution
    const result = await tasks([
        {
            label: "Installing dependencies",
            action: async () => {
                await installDependencies();
            },
        },
        {
            label: "Building project",
            action: async () => {
                await buildProject();
            },
        },
    ]);

    // Sequential execution
    await tasks(taskList, { concurrent: false });

    // Parallel execution (default)
    await tasks(taskList, { concurrent: true });
    ```

    **Methods**

    -   `tasks.add(taskList: Task[], options?: { concurrent?: boolean })` - Add tasks dynamically during execution
    -   `tasks.sequential(taskList: Task[])` - Execute tasks sequentially
    -   `tasks.parallel(taskList: Task[])` - Execute tasks in parallel

-   ### `completedFields(options: CompletedFieldsOpts)`

    Show the status of completed fields.

    ```ts
    interfaceCompletedFieldsOpts {
        filter: string[];
    }
    ```

## Create a prompt

```ts
import React, { useState } from "react";
import { Text, useInput } from "ink";
import { createPrompt } from "askeroo/core";

// Define your options interface
export interface CustomOptions {
    label: string;
    placeholder?: string;
}

// Create and export the plugin
export const customField = createPrompt<CustomOptions, string>({
    type: "custom-field",
    interactive: true,
    component: ({ node, options, events }: any) {
        const [value, setValue] = useState("");

        useInput((input, key) => {
            if (key.return) {
                events.onSubmit?.(value);
            } else if (input) {
                setValue((prev) => prev + input);
            }
        });

        // Handle different states
        if (node.state === "completed") {
            return (
                <Text>
                    {options.label}: <Text color="blue">{node.completedValue}</Text>
                </Text>
            );
        }

        if (node.state === "disabled") {
            return <Text dimColor>{options.label}: ...</Text>;
        }

        return (
            <Text>
                {options.label}: {value}
            </Text>
        );
    }
});
```

### Usage

```ts
import { ask } from "askeroo/core";
import { customField } from "./custom-field.js"; // Import registers the plugin

const result = await ask(async () => {
    const input = await customField({
        label: "Enter something",
    });
    return { input };
});
```

## Examples

Run the included example:

```bash
npm run example       # Ink UI example
```

## Development

```bash
npm install
npm run build
npm run dev          # Watch mode
```

## License

MIT
