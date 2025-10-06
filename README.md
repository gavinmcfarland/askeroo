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

## Prompts

-   ### `text(options: TextOpts)`

    Show a text input.

-   ### `confirm(options: ConfirmOpts)`

    Show a confirmation with choice of yes or no.

-   ### `radio(options: RadioOpts)`

    Show a single-choice selection from multiple options.

-   ### `multi(options: MultiOpts)`

    Show a multi-choice selection allowing multiple options.

-   ### `note(MarkdownString)`

    Show a note using markdown.

-   ### `component(options: ComponentOpts)`

    Render a React component using Ink.

-   ### `tasks(taskList: Task[], options?: TasksOpts)`

    Execute a list of tasks with progress indication and error handling.

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
