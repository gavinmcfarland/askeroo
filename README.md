# Askeroo

A modern CLI prompt library with flow control, history navigation, and conditional fields. Built with TypeScript, Ink (React for CLI), and ES Modules.

## Features

- ✅ **Flow-based**: Define complex prompt flows with groups and conditional logic
- ✅ **History Navigation**: Navigate backwards with Escape key following smart rules
- ✅ **TypeScript**: Full TypeScript support with type safety
- ✅ **React/Ink**: Beautiful CLI interfaces using React components
- ✅ **Generator-powered**: Under the hood uses generators for flow control
- ✅ **Validation**: Built-in validation support for all field types
- ✅ **ES Modules**: Modern ESM syntax throughout

## Installation

```bash
npm install askeroo
```

## Usage

### Basic Example

```typescript
import { ask, group, text, confirm } from "askeroo/core";

const flow = async () => {
  // Group 1: Profile
  const profile = await group({ message: "Profile" }, async () => {
    const first = await text({ message: "First name" });
    const last  = await text({ message: "Last name" });
    return { first, last };
  });

  // Group 2: Preferences (with conditional)
  const prefs = await group({ message: "Preferences" }, async () => {
    const role = await text({ message: "Role (user/admin)" });
    if (role === "admin") {
      const code = await text({ message: "Access code" });
      return { role, code };
    }
    const news = await confirm({ message: "Subscribe to newsletter?" });
    return { role, news };
  });

  return { profile, prefs };
};

const result = await ask(flow);
console.log(result);
```

### With Validation

```typescript
import { ask, text } from "askeroo/core";
import { validateRequired, validateEmail } from "askeroo/utils";

const flow = async () => {
  const email = await text({
    message: "Email address",
    placeholder: "your@email.com",
    validate: (value: string) => {
      const required = validateRequired(value);
      if (required !== true) return required;
      return validateEmail(value);
    }
  });

  return { email };
};
```

## API

### Core Functions

#### `ask<T>(flow: () => Promise<T>): Promise<T>`
Executes a flow and returns the collected results.

#### `text(config: TextFieldConfig): Promise<string>`
Creates a text input field.

```typescript
interface TextFieldConfig {
  message: string;
  placeholder?: string;
  validate?: (value: string) => boolean | string;
}
```

#### `confirm(config: ConfirmFieldConfig): Promise<boolean>`
Creates a confirm (yes/no) field.

```typescript
interface ConfirmFieldConfig {
  message: string;
  initial?: boolean;
}
```

#### `group<T>(config: GroupConfig, fn: () => Promise<T>): Promise<T>`
Creates a group of related fields.

```typescript
interface GroupConfig {
  message: string;
}
```

### Navigation Rules

The navigation system follows these rules:

- **Within a group on first field + Escape**: Takes user back to the last field in the previous group
- **Within a group on later field + Escape**: Takes user back to the previous field in the same group
- **Enter**: Moves to the next field or completes the flow
- **Ctrl+C**: Gracefully exits the CLI with a goodbye message

### Validation Utilities

```typescript
import { validateRequired, validateEmail, validateMinLength } from "askeroo/utils";

// Built-in validators
validateRequired(value)           // Ensures value is not empty
validateEmail(value)              // Validates email format
validateMinLength(5)(value)       // Ensures minimum length

// Custom validation
const validate = (value: string) => {
  if (value.length < 3) return "Must be at least 3 characters";
  return true;
};
```

## Field Types

### Text Field
- Accepts text input
- Supports placeholder text
- Custom validation support
- Real-time input feedback
- Navigation: Escape (back), Enter (submit), Ctrl+C (exit)

### Confirm Field
- Yes/No selection
- Keyboard navigation (y/n, arrows)
- Initial value support
- Navigation: Escape (back), Enter (submit), Ctrl+C (exit)

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Running Example

```bash
npm run build && node dist/example.js
```

## Architecture

- **Flow Manager**: Handles state, history, and navigation
- **Generator-based**: Uses generators for flow control under the hood
- **React Components**: Each field type is a React component using Ink
- **Type Safety**: Full TypeScript coverage for all APIs

## Requirements

- Node.js >= 18.0.0
- Terminal that supports ANSI escape sequences

## License

MIT