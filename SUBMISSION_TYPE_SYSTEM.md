# Submission Type System

The submission type system provides fine-grained control over how prompts are submitted and whether users can navigate back to them. This is particularly useful for auto-submitted prompts like notes or display-only fields.

## Overview

Every prompt that is submitted now tracks **how** it was submitted using a `submissionType`:

-   `"manual"` - User manually submitted (e.g., pressed Enter)
-   `"auto"` - Auto-submitted without user interaction
-   `"skipped"` - Prompt was skipped programmatically
-   `"programmatic"` - Submitted by code/system logic

## Component-Level Auto-Submit

Auto-submit behavior is now controlled **within the plugin component itself**, not through options. Components submit with special values to indicate the submission type.

### Creating an Auto-Submit Plugin

```typescript
import React, { useEffect } from "react";
import { createPrompt } from "askeroo";

export const note = createPrompt<NoteOptions, void>({
    type: "note",

    component: ({ node, options, events }: any) => {
        // Auto-submit when component becomes active
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit({ type: "auto" }); // Consistent format
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <Box>{/* Render content */}</Box>;
    },
});
```

### Submission Format

Components use a consistent object format to indicate submission type:

```typescript
// Auto-submission (no value)
events.onSubmit({ type: "auto" });

// Auto-submission with a value
events.onSubmit({ type: "auto", value: data });

// Skip submission
events.onSubmit({ type: "skip" });

// Programmatic submission
events.onSubmit({ type: "programmatic", value: result });

// Manual submission (default)
events.onSubmit(value); // Any non-object or object without 'type' property
```

## Back Navigation Control

The submission type determines whether users can navigate back to a prompt:

### Default Behavior

-   **Auto-submitted prompts**: Cannot go back to them (they would just auto-submit again)
-   **Manual prompts**: Can go back normally
-   **Programmatic/Skipped**: Depends on context

### Explicit Control with `allowBack`

You can override the default behavior:

```typescript
// Auto-submit with no back navigation (typical)
await note("Installing...", {
    allowBack: false,
});

// Manual prompt that prevents going back
await text({
    label: "One-time code",
    allowBack: false,
});
```

## Checking Back Navigation Availability

The `node.allowBack` prop automatically considers submission types, so plugin developers can simply check it:

### In Custom Plugins

```typescript
import { createPrompt } from "askeroo";

export const smartPrompt = createPrompt({
    type: "smartPrompt",
    component: ({ node, options, events }) => {
        // node.allowBack is automatically computed based on:
        // 1. Explicit allowBack setting
        // 2. First prompt check
        // 3. Previous node's submission type

        // Simply check the computed value
        const canGoBack = node.allowBack;

        return (
            <Box>
                <Text>Content here</Text>
                {canGoBack && <Text color="gray">Press Ctrl+C to go back</Text>}
            </Box>
        );
    },
});
```

### Understanding the Computed Value

The `node.allowBack` prop is computed automatically and considers:

1. **Explicit Setting**: If `allowBack: false` is set, it's always `false`
2. **First Prompt**: The first interactive prompt always has `allowBack: false`
3. **Previous Submission Type**: If the previous prompt was auto-submitted, `allowBack` is `false`

This means plugin developers don't need to query the tree manager or check submission types manually - the prop contains all the necessary logic.

### Advanced: Accessing Tree Manager (Rarely Needed)

If you need to access submission type details directly:

```typescript
import { getCurrentTreeManager } from "askeroo/core";

export const advancedPrompt = createPrompt({
    type: "advancedPrompt",
    component: ({ node, options, events }) => {
        // Usually not needed - use node.allowBack instead
        const treeManager = getCurrentTreeManager();
        const previousNode = treeManager.getPreviousNode();
        const prevSubmissionType = previousNode?.submissionType;

        // Make decisions based on previous submission
        if (prevSubmissionType === "auto") {
            // Previous was auto-submitted
        }

        return <YourComponent />;
    },
});
```

## API Reference

### PromptNode Properties

```typescript
interface PromptNode {
    // ... other properties

    // Submission tracking
    submissionType?: "manual" | "auto" | "skipped" | "programmatic";
}
```

### PromptTreeManager Methods

```typescript
class PromptTreeManager {
    /**
     * Mark a node as submitted with a specific submission type
     */
    markNodeSubmitted(
        nodeId: string,
        submissionType: "manual" | "auto" | "skipped" | "programmatic"
    ): boolean;

    /**
     * Get the submission type of a node
     */
    getNodeSubmissionType(
        nodeId: string
    ): "manual" | "auto" | "skipped" | "programmatic" | undefined;

    /**
     * Get the previous node in history
     */
    getPreviousNode(): PromptNode | null;

    /**
     * Check if back navigation should be allowed based on
     * previous node's submission type
     */
    canGoBackBasedOnSubmissionType(): boolean;

    /**
     * Enhanced canGoBack that considers submission types
     */
    canGoBackEnhanced(): boolean;
}
```

## Use Cases

### 1. Display-Only Prompts That Don't Block Navigation

```typescript
// Show a note that auto-dismisses
await note("Starting installation...");

// The note auto-submits and users can't go back to it
// (prevents confusion where going back would just show it again)
```

### 2. Progress Indicators

```typescript
await completedFields({ maxFields: 5 });
// Shows completed fields, auto-submits, user can't go back
// (going back would be confusing since it's just a display)
```

### 3. Multi-Step Wizards with Smart Navigation

```typescript
const flow = async () => {
    // Step 1: Show intro (auto-submit, can't go back)
    await note("Welcome to the wizard!", {
        allowBack: false,
    });

    // Step 2: Get user input (manual, can go back)
    const name = await text({ label: "Your name" });

    // Step 3: Confirm (manual, can go back)
    const confirmed = await confirm({ label: "Is this correct?" });

    if (!confirmed) {
        // User can navigate back to change name
        // But can't go back to the welcome note
    }

    return { name, confirmed };
};
```

## Creating Custom Auto-Submit Plugins

### Basic Pattern

```typescript
export const myAutoPlugin = createPrompt<Options, Result>({
    type: "myAutoPlugin",

    component: ({ node, options, events }) => {
        // Auto-submit logic
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                const timer = setTimeout(() => {
                    events.onSubmit("__auto");
                }, 10);
                return () => clearTimeout(timer);
            }
        }, [node.state, events.onSubmit]);

        return <YourComponent />;
    },
});
```

### Conditional Auto-Submit

```typescript
export const conditionalPlugin = createPrompt({
    type: "conditionalPlugin",

    component: ({ node, options, events }) => {
        useEffect(() => {
            if (node.state === "active" && events.onSubmit) {
                // Conditionally auto-submit based on options
                if (options.shouldAutoSubmit) {
                    const timer = setTimeout(() => {
                        events.onSubmit("__auto");
                    }, 10);
                    return () => clearTimeout(timer);
                }
            }
        }, [node.state, events.onSubmit, options.shouldAutoSubmit]);

        return <YourComponent />;
    },
});
```

### Auto-Submit with Value

```typescript
export const computedPlugin = createPrompt({
    type: "computedPlugin",

    component: ({ node, options, events }) => {
        const [computed, setComputed] = useState(null);

        useEffect(() => {
            // Compute value asynchronously
            async function compute() {
                const result = await someComputation();
                setComputed(result);
            }
            compute();
        }, []);

        useEffect(() => {
            if (
                node.state === "active" &&
                events.onSubmit &&
                computed !== null
            ) {
                // Auto-submit with the computed value
                events.onSubmit({
                    value: computed,
                    __submissionType: "auto",
                });
            }
        }, [node.state, events.onSubmit, computed]);

        return <Text>Computing: {computed ?? "..."}</Text>;
    },
});
```

## Best Practices

1. **Use auto-submit for display-only prompts**: Notes, progress indicators, and informational messages should auto-submit to avoid blocking the flow.

2. **Set `allowBack: false` for auto-submitted prompts**: If users shouldn't return to an auto-submitted prompt, explicitly prevent it.

3. **Use submission types for conditional logic**: Check previous prompt's submission type to make smart navigation decisions.

4. **Add minimal delay before auto-submit**: Use `setTimeout` with ~10ms to allow rendering before submitting.

5. **Test navigation flows**: Ensure users can't get stuck in navigation loops with auto-submitted prompts.

## Examples

### Example 1: Installation Wizard

```typescript
const installWizard = async () => {
    // Welcome screen (auto-submit)
    await note("# Installation Wizard\n\nSetting up your project...", {
        allowBack: false,
    });

    // Get project details
    const projectName = await text({ label: "Project name" });
    const framework = await radio({
        label: "Framework",
        options: [
            { value: "react", label: "React" },
            { value: "vue", label: "Vue" },
        ],
    });

    // Show progress (auto-submit)
    await note("Installing dependencies...");

    // User can go back to change projectName/framework
    // But can't go back to the progress note or welcome screen

    return { projectName, framework };
};
```

### Example 2: Smart Form with Progress Display

```typescript
const smartForm = async () => {
    // Step 1: Show previous answers if any (auto-submit)
    await completedFields({
        maxFields: 3,
        allowBack: false,
    });

    // Step 2: Get new input
    const email = await text({ label: "Email" });

    // Step 3: Verification
    const code = await text({
        label: "Verification code",
        allowBack: false, // Can't go back once code is entered
    });

    return { email, code };
};
```
