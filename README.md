# Askeroo

A modern CLI prompt library with flow control, back navigation, and conditional fields.

> [!WARNING]
> This library is still in alpha and things might change before release.

## Features

-   Works great out of the box, with key prompts, like text, radio, multi
-   Create your own bespoke prompts using a highly flexible framework
-   Runs prompts in a flow which you can configure and customise to suit your needs
-   Stateful navigation that preserves user's inputs and supports back navigation
-   Return structured data your way with imperative-style functions
-   Write dynamic branching with groups and conditionals
-   Run tasks with progress tracking, parallel or sequential execution, and error handling
-   Display notes with support for markdown and chalk syntax

## Installation

```bash
npm i askeroo
```

## Quick Start

Askeroo comes with a default runtime and set of prompts that you can use out of the box.

```typescript
import { ask, group, text, confirm, note } from "askeroo";

const flow = async () => {
    // Display notes
    await note("[Hello world!]{bgBlue}");

    // Call prompts on their own
    const nickname = await text({ label: "Nickname" });

    // Group prompts together
    const profile = await group(async () => {
        const first = await text({ label: "First name" });
        const last = await text({ label: "Last name" });
        return { first, last };
    });

    // Create conditional inputs
    const prefs = await group(
        async () => {
            const role = await text({ label: "Role (user/admin)" });
            if (role === "admin") {
                const code = await text({ label: "Access code" });
                return { role, code };
            }
            const news = await confirm({ label: "Subscribe to newsletter?" });
            return { role, news };
        },
        { label: "Preferences" } // Optional group labels
    );

    // Return structured data your way
    return { nickname, profile, prefs };
};

const result = await ask(flow);
console.log(result);
```

## How does Askeroo work?

Askeroo is built around the concept of a flow, where each prompt is executed in sequence. Some prompts can auto-submit, while others wait for user input, and each prompt can appear in different states—before activation, while active, and after completion. Prompts are also dynamic: they can be updated or changed at any point within your flow function.

When you call `ask(flow)`, Askeroo sets up a runtime that runs your flow function **multiple times** using a replay mechanism. This allows for a smooth and interactive experience:

1. **First run**: The flow executes, prompts are shown one by one, and answers are stored.
2. **User navigates back**: The runtime replays the flow, automatically filling in previous answers.
3. **User changes an answer**: The runtime clears any answers that came after the changed prompt and continues from there.
4. **Repeat**: This process continues until the user completes the flow.

From the user's perspective, this feels like a seamless way to move back and forth between prompts. Behind the scenes, Askeroo is replaying your flow function as needed to determine which prompts should be shown at each step.

```ts
// Your flow function runs multiple times
const flow = async () => {
    const role = await radio({
        label: "Select your role",
        options: ["Developer", "Designer"],
    });

    if (role === "Developer") {
        const language = await radio({
            label: "Preferred language",
            options: ["TypeScript", "JavaScript"],
        });
        return { role, language };
    }

    const tool = await radio({
        label: "Design tool",
        options: ["Figma", "Sketch"],
    });
    return { role, tool };
};
```

**Flow:**

```
Select your role: Developer
   ↓
Preferred language: TypeScript
   ↓
User presses back ⬆
   ↓
Select your role: Designer
   ↓
Design tool: Figma
   ↓
Complete
```

The flow replays automatically when the user navigates back, clearing subsequent answers and showing the appropriate prompts based on the new selection.

## Running Flows

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

## Create Custom Prompts

Askeroo uses **automatic plugin registration** - when you create a prompt with `createPrompt`, it registers itself when imported. This means:

-   ✅ No manual registration needed
-   ✅ Only bundle the prompts you actually use
-   ✅ Custom prompts work exactly like built-in ones

```ts
import React, { useState } from "react";
import { Text, useInput } from "ink";
import { createPrompt } from "askeroo";

// Define your options interface
export interface CustomOptions {
    label: string;
    placeholder?: string;
}

// Create and export the plugin - it auto-registers when imported!
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
import { ask } from "askeroo";
import { customField } from "./custom-field.js"; // Auto-registers when imported!

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
npm run example
```

Try `npm run build && npm run example test-run`

## Development

```bash
npm install
npm run build
npm run dev          # Watch mode
```

## License

MIT
