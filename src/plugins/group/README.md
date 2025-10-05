# Group Function

The `group` function provides a way to organize and structure prompts into logical groups with different execution flows.

**Note:** Groups are NOT plugins - they are structural elements rendered by `RecursiveGroupContainer`, not through the plugin system. This directory contains the group function for organizational purposes.

## Basic Usage

### Progressive Groups (Default)

Progressive groups reveal fields one at a time as the user completes them:

```typescript
import { ask, group, text } from "askeroo";

const result = await ask(async () => {
    const userInfo = await group(
        async () => {
            const name = await text({ label: "Name" });
            const email = await text({ label: "Email" });
            const age = await text({ label: "Age" });
            return { name, email, age };
        },
        { label: "User Information" }
    );

    return userInfo;
});
```

### Static Groups

Static groups discover and display all fields upfront:

```typescript
const userInfo = await group(
    async () => {
        const name = await text({ label: "Name" });
        const email = await text({ label: "Email" });
        return { name, email };
    },
    {
        label: "User Information",
        flow: "static",
        enableArrowNavigation: true, // Allow arrow keys to navigate between fields
    }
);
```

### Phased Groups

Phased groups show only one field at a time:

```typescript
const userInfo = await group(
    async () => {
        const name = await text({ label: "Name" });
        const email = await text({ label: "Email" });
        return { name, email };
    },
    {
        label: "User Information",
        flow: "phased",
    }
);
```

## Group Options

### GroupMeta

-   `label?: string` - Optional label for the group
-   `id?: string` - Optional custom ID for the group (generated automatically if not provided)

### GroupOpts

-   `flow?: "progressive" | "phased" | "static"` - Execution flow type
    -   `"progressive"` (default): Fields are progressively revealed as the user answers them
    -   `"phased"`: Only one field is visible at a time
    -   `"static"`: Discover all fields upfront, enable arrow navigation
-   `enableArrowNavigation?: boolean` - Only available with `flow: "static"`, enables arrow key navigation

## Nested Groups

Groups can be nested to create hierarchical structures:

```typescript
const result = await group(
    async () => {
        const personal = await group(
            async () => {
                const name = await text({ label: "Name" });
                const age = await text({ label: "Age" });
                return { name, age };
            },
            { label: "Personal Info" }
        );

        const contact = await group(
            async () => {
                const email = await text({ label: "Email" });
                const phone = await text({ label: "Phone" });
                return { email, phone };
            },
            { label: "Contact Info" }
        );

        return { personal, contact };
    },
    { label: "User Registration" }
);
```

## Flow Types Explained

### Progressive Flow

-   **Behavior**: Fields are progressively revealed as the user answers them
-   **Use case**: Linear workflows where each field depends on the previous one
-   **Navigation**: Standard forward/back navigation with escape key

### Phased Flow

-   **Behavior**: Only one field is visible at a time
-   **Use case**: When you want to focus on one field at a time
-   **Navigation**: Standard forward/back navigation with escape key

### Static Flow

-   **Behavior**: All fields are discovered and displayed upfront
-   **Use case**: Forms where users want to see all fields before starting
-   **Navigation**: Arrow keys to move between fields (when `enableArrowNavigation: true`)
-   **Discovery**: Fields are pre-scanned before the group executes

## Signature Compatibility

The group function supports two call signatures for backward compatibility:

```typescript
// New signature with explicit meta
group(
    { label: "My Group", id: "custom-id" },
    async () => {
        /* body */
    },
    { flow: "static" }
);

// Old signature with combined options
group(
    async () => {
        /* body */
    },
    { label: "My Group", flow: "static" }
);
```

## Technical Details

### Group Context

Groups maintain an execution context that:

-   Tracks the current group in the hierarchy
-   Manages depth for indentation
-   Handles field discovery for static groups
-   Coordinates navigation state

### Integration with Runtime

The group plugin integrates with the core runtime to:

-   Enter/exit group contexts during execution
-   Manage the group stack for nested groups
-   Handle field discovery for static flows
-   Coordinate with the prompt tree for rendering

### Visual Representation

Groups are rendered with:

-   Optional label shown at the group level
-   Indentation based on depth (3 spaces per level)
-   Children fields rendered recursively
-   Proper spacing and visual hierarchy
