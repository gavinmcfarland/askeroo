# CompletedFields

Displays completed fields with filtering, grouping, and real-time updates that automatically refresh as fields are added or removed.

## Usage

```ts
import { completedFields } from "askeroo";

// Basic usage - show all completed fields
await completedFields();

// Filter fields by group
await completedFields({
    filter: ["group-id"],
});
```

## Options

| Prop        | Type       | Default | Description                      |
| ----------- | ---------- | ------- | -------------------------------- |
| `filter`    | `string[]` | -       | Array of group id to filter by   |
| `maxFields` | `number`   | -       | Maximum number of fields to show |

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
