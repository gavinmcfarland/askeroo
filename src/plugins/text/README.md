# Text

The text plugin provides a text input field with cursor support and keyboard shortcuts for collecting user input.

## Usage

```ts
import { text } from "askeroo";

// Basic usage
const name = await text({ label: "What's your name?" });

// With initial value
const email = await text({
    label: "Email address:",
    initialValue: "user@example.com",
});

// With short label for completed state
const username = await text({
    label: "Enter username:",
    shortLabel: "Username",
});
```

## Options

| Prop           | Type     | Default  | Description                       |
| -------------- | -------- | -------- | --------------------------------- |
| `label`        | `string` | Required | The question to display           |
| `shortLabel`   | `string` | -        | Shorter label for completed state |
| `initialValue` | `string` | `""`     | Pre-populated value               |

## Keyboard Controls

| Key                 | Action                         |
| ------------------- | ------------------------------ |
| `Return`            | Submit input                   |
| `Escape`            | Go back (if allowed)           |
| `Left/Right Arrow`  | Move cursor                    |
| `Ctrl+U` or `Cmd+K` | Clear input                    |
| `Ctrl+A`            | Move cursor to start           |
| `Ctrl+E`            | Move cursor to end             |
| `Backspace`         | Delete character before cursor |

## Types

```ts
interface TextOptions {
    label: string;
    shortLabel?: string;
    initialValue?: string;
}
```
