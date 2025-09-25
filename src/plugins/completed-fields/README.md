# CompletedFields Plugin

A plugin that displays completed fields with filtering, grouping, and real-time updates.

## Features

- **Filter by Groups**: Show fields from specific groups only
- **Group Headers**: Optional group headers for organization
- **Real-time Updates**: Automatically updates when fields complete/uncomplete
- **Field Removal**: Remove fields when user goes back
- **Sorting**: Fields sorted by completion time (most recent first)
- **Limit**: Optional limit on number of fields shown

## Plugin Usage

```javascript
// Basic usage - show all completed fields
await completedFields();

// Filter by specific groups
await completedFields({
  filter: ['User Info', 'Settings']
});

// Customize display
await completedFields({
  filter: ['group-name'],
  showGroupHeaders: false,
  maxFields: 5,
  title: 'Recently Completed'
});
```

## Managing Field State

```javascript
import { completedFieldsUtils } from './plugins/completed-fields/CompletedFields';

// Add a field when it completes
completedFieldsUtils.addField({
  groupName: 'User Info',
  label: 'Name',
  shortLabel: 'Name',
  value: 'John Doe'
});

// Remove field when user goes back
completedFieldsUtils.removeFieldByLabel('Name', 'User Info');

// Clear entire group
completedFieldsUtils.clearGroup('User Info');

// Clear all fields
completedFieldsUtils.clearFields();

// Get current fields
const fields = completedFieldsUtils.getFields();
```

## Options Interface

```tsx
interface CompletedFieldsOptions {
  filter?: string[];         // Array of group names to filter by
  showGroupHeaders?: boolean; // Show group headers (default: true)
  maxFields?: number;        // Maximum number of fields to show
  title?: string;            // Custom title (default: "Completed Fields")
}
```

## CompletedField Interface

```tsx
interface CompletedField {
  id: string;
  groupName?: string;
  label: string;
  shortLabel?: string;
  value: string;
  timestamp: number;
}
```

## Integration Example

```javascript
// In your form logic
async function runForm() {
  // Add fields as they complete
  const name = await text({ message: 'Name' });
  completedFieldsUtils.addField({
    groupName: 'User Info',
    label: 'Name',
    value: name
  });

  const email = await text({ message: 'Email' });
  completedFieldsUtils.addField({
    groupName: 'User Info',
    label: 'Email',
    value: email
  });

  // Show completed fields from specific group
  await completedFields({
    filter: ['User Info']
  });
}

// Handle going back (remove field)
function handleBack(label, groupName) {
  completedFieldsUtils.removeFieldByLabel(label, groupName);
}
```

## Utility Functions

| Function | Description |
|----------|-------------|
| `addField(field)` | Add a new completed field |
| `removeField(fieldId)` | Remove field by ID |
| `removeFieldByLabel(label, groupName?)` | Remove field by label and optional group |
| `clearFields()` | Clear all fields |
| `clearGroup(groupName)` | Clear all fields from a specific group |
| `getFields()` | Get array of all current fields |

## Real-time Updates

The plugin automatically updates when fields are added or removed using the utility functions. The display will refresh in real-time as fields complete or are removed when users navigate back.