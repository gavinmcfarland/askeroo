# Askeroo

A modern CLI prompt library with flow control, back navigation, and conditional fields using Ink.

## Features

- = **Flow Control**: Advanced conditional prompts with dynamic branching
-  **Back Navigation**: Intelligent back button with replay functionality
- <� **Beautiful UI**: Powered by Ink for rich terminal interfaces
- =� **TypeScript**: Full type safety and IntelliSense support
- =� **Modern ESM**: Uses ES modules for better tree-shaking
- = **Replay Engine**: Smart prompt replay with conditional branching

## Installation

```bash
npm install askeroo
```

## Quick Start

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

## How It Works

Askeroo uses a **replay-based engine** that re-runs your flow function each time you navigate or provide answers. This enables:

- **Dynamic branching**: Conditionals like `if (role === "admin")` are re-evaluated each replay
- **Intelligent back navigation**: Type `<` to go back one step, automatically clearing dependent answers
- **Linear visible sequence**: Only prompts actually reached in the current path are shown
- **Automatic pruning**: Answers from paths no longer taken are removed

## API Reference

### Core Functions

#### `ask(flow: FlowFunction): Promise<T>`
Executes a prompt flow with replay and navigation support.

```typescript
const result = await ask(async () => {
  const name = await text({ message: "Name" });
  return { name };
});
```

#### `group(options: PromptOpts, body: () => Promise<T>): Promise<T>`
Creates a visual group of related prompts.

```typescript
const profile = await group({ message: "Profile" }, async () => {
  const first = await text({ message: "First name" });
  const last = await text({ message: "Last name" });
  return { first, last };
});
```

#### `text(options: PromptOpts): Promise<string>`
Prompts for text input.

```typescript
const name = await text({ message: "What's your name?" });
const email = await text({ message: "Email", name: "user_email" }); // with stable ID
```

#### `confirm(options: PromptOpts): Promise<boolean>`
Prompts for yes/no confirmation.

```typescript
const subscribe = await confirm({ message: "Subscribe to newsletter?" });
```

### Types

```typescript
type PromptOpts = {
  message: string;
  name?: string;  // Optional stable ID for the prompt
};
```

## Back Navigation

- Type `<` at any prompt to go back to the previous step
- The engine automatically:
  - Decrements the cursor position
  - Clears answers that are no longer reachable
  - Replays the flow from the beginning with the new cursor position
  - Re-evaluates all conditionals with current answers

## Custom UI

Create your own UI implementation:

```typescript
import { createRuntime } from "askeroo";

const customUI = {
  async text(msg: string): Promise<string | { __back: true }> {
    // Your custom text input implementation
  },
  async confirm(msg: string): Promise<boolean | { __back: true }> {
    // Your custom confirm implementation
  },
  showGroup(label: string): void {
    // Your custom group display
  }
};

const { ask, group, text, confirm } = createRuntime(customUI);
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