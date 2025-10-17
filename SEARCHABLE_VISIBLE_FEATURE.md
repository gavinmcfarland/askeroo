# Filter Mode Feature

## Overview

The `@radio` and `@multi` prompts now support a filter mode that can be activated with **Shift+F**, allowing users to see exactly what they're typing with a fully functional text cursor.

## Usage

The `searchable` option now accepts three values:

-   `false` (default): No search functionality
-   `true`: Hidden search - filters options as you type, but no visible input field
-   `"filter"`: Filter mode - press **Shift+F** to activate a visible input field between the label and options with full cursor support

## Examples

### Radio with Filter Mode

```typescript
import { ask, radio } from "askeroo";

const flow = async () => {
    const language = await radio({
        label: "Select your favorite programming language",
        options: [
            { value: "javascript", label: "JavaScript" },
            { value: "typescript", label: "TypeScript" },
            { value: "python", label: "Python" },
            { value: "rust", label: "Rust" },
            // ... more options
        ],
        searchable: "filter", // Enable filter mode - press Shift+F to activate
        maxVisible: 8,
    });

    return { language };
};
```

### Multi with Filter Mode

```typescript
import { ask } from "askeroo";
import { multi } from "askeroo/built-ins/multi";

const flow = async () => {
    const techStack = await multi({
        label: "Select your tech stack",
        options: [
            { value: "react", label: "React" },
            { value: "vue", label: "Vue" },
            { value: "angular", label: "Angular" },
            // ... more options
        ],
        searchable: "filter", // Enable filter mode - press Shift+F to activate
        maxVisible: 8,
    });

    return { techStack };
};
```

## Features

When `searchable: "filter"` is enabled:

### Activation

-   **Shift+F**: Toggle filter mode on/off
-   Filter mode shows a visible input field between the label and options
-   **Escape**: Close filter mode and clear search (or go back if not in filter mode)

### Keyboard Navigation (when filter mode is active)

-   **Arrow keys (left/right)**: Move cursor within the search input
-   **Arrow keys (up/down)**: Navigate through filtered options
-   **Ctrl/Cmd + U or Cmd + K**: Clear the entire search input
-   **Ctrl + A**: Move cursor to the start of input
-   **Ctrl + E**: Move cursor to the end of input
-   **Backspace/Delete**: Delete character before cursor

### Visual Feedback

-   Displays a text input field between the label and options when active
-   Shows a visible cursor indicating current position
-   Highlights matching text in the options (underlined)
-   Filters options in real-time as you type
-   Shows "shift+f filter" hint when filter mode is available

## Comparison

### Hidden Search (`searchable: true`)

```typescript
searchable: true;
```

-   No visible input field
-   Type to filter - you see the results but not what you're typing
-   Simple and clean interface
-   Good for quick filtering
-   Always active

### Filter Mode (`searchable: "filter"`)

```typescript
searchable: "filter";
```

-   Activated with **Shift+F**
-   Visible text input field between the label and options when active
-   Full cursor support with arrow key navigation
-   See exactly what you're typing
-   Better for complex searches or when precision is needed
-   Can be toggled on/off as needed

## Try It

Run the example files to see the feature in action:

```bash
npx tsx examples/radio-searchable-visible.ts
npx tsx examples/multi-searchable-visible.ts
npx tsx examples/radio-searchable-comparison.ts
```

## Implementation Details

The filter mode input behaves exactly like the `@text` prompt:

-   Cursor position management
-   Left/right arrow movement within the input
-   Full editing capabilities (insert, delete, clear)
-   Keyboard shortcuts for common operations
-   Visual cursor display with background highlighting
-   Activates/deactivates with **Shift+F**
-   Automatically clears when closed
