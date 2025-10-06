# CompletedFields

Displays completed fields with filtering, grouping, and real-time updates that automatically refresh as fields are added or removed.

## Usage

```ts
import { completedFields, completedFieldsUtils } from "askeroo";

// Basic usage - show all completed fields
await completedFields();

// Filter by specific groups
await completedFields({
    filter: ["User Info", "Settings"],
});

// Customize display
await completedFields({
    filter: ["group-id"],
});

// Add a field when it completes
completedFieldsUtils.addField({
    groupName: "User Info",
    label: "Name",
    shortLabel: "Name",
    value: "John Doe",
});

// Remove field when user goes back
completedFieldsUtils.removeFieldByLabel("Name", "User Info");
```

## Options

| Prop        | Type       | Default | Description                      |
| ----------- | ---------- | ------- | -------------------------------- |
| `filter`    | `string[]` | -       | Array of group id to filter by   |
| `maxFields` | `number`   | -       | Maximum number of fields to show |

## Utility Functions

| Function                                | Description                                   |
| --------------------------------------- | --------------------------------------------- |
| `addField(field)`                       | Add a new completed field                     |
| `removeField(fieldId)`                  | Remove field by ID                            |
| `removeFieldByLabel(label, groupName?)` | Remove field by label and optional group name |
| `clearFields()`                         | Clear all fields                              |
| `clearGroup(groupName)`                 | Clear all fields from a specific group        |
| `getFields()`                           | Get array of all current fields               |

## Types

```ts
interface CompletedFieldsOptions {
    filter?: string[];
    showGroupHeaders?: boolean;
    maxFields?: number;
    title?: string;
}

interface CompletedField {
    id: string;
    groupName?: string;
    label: string;
    shortLabel?: string;
    value: string;
    timestamp: number;
}
```
