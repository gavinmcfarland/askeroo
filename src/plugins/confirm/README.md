# Enhanced Confirm Plugin

The enhanced confirm plugin builds on the old component functionality to provide more flexible confirmation prompts.

## Features

### ✅ **Custom Options**
Define your own options beyond Yes/No:

```typescript
await confirm({
  message: "Choose your preferred approach:",
  options: [
    { value: 'aggressive', label: 'Aggressive' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'conservative', label: 'Conservative' }
  ]
});
```

### ✅ **Default Yes/No Behavior**
Works exactly like before when no options provided:

```typescript
await confirm({
  message: "Continue with deployment?"
  // Defaults to [{ value: true, label: "Yes" }, { value: false, label: "No" }]
});
```

### ✅ **Quick Y/N Keys**
For default Yes/No options, users can still press `y` or `n` for quick selection.

### ✅ **Arrow Key Navigation**
Navigate through options with arrow keys:
- `←` / `→` or `↑` / `↓` to navigate options
- `allowLoop: false` to disable wrapping around

### ✅ **Markdown Support**
Full markdown support for messages:

```typescript
import { md } from '../../../index.js';

await confirm({
  message: md`
    ## Deploy to Production

    This will **overwrite** the current deployment.
    Are you sure?
  `
});
```

### ✅ **Enhanced Hint Text**
Smart hint text that adapts based on configuration:
- Shows "y/n quick select" for default options
- Shows available navigation keys
- Contextual back navigation hints

### ✅ **Better Visual Design**
- Clear option indicators (● for selected, ○ for unselected)
- Consistent completion states
- Better disabled state handling

## Migration from Old Plugin

The enhanced plugin is **fully backward compatible**:

```typescript
// Old usage still works
await confirm({ message: "Continue?" });

// New usage with enhanced features
await confirm({
  message: "Select build type:",
  options: [
    { value: 'dev', label: 'Development' },
    { value: 'stage', label: 'Staging' },
    { value: 'prod', label: 'Production' }
  ],
  allowLoop: false
});
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` / `label` | `string` | Required | The question to ask |
| `options` | `ConfirmOption[]` | `[{value: true, label: "Yes"}, {value: false, label: "No"}]` | Custom options |
| `allowLoop` | `boolean` | `true` | Whether arrow keys wrap around |
| `initialValue` | `any` | First option value | Pre-selected value |

## Types

```typescript
interface ConfirmOption {
  value: any;
  label: string;
}

interface ConfirmOptions {
  message?: string;
  label?: string;
  options?: ConfirmOption[];
  allowLoop?: boolean;
  id?: string;
}
```