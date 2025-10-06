# Radio

The radio plugin provides a single-select interface for choosing one option from a list with support for search, scrolling, hints, and quick number selection.

## Usage

```ts
import { radio } from "askeroo";

// Basic usage
const framework = await radio({
    label: "Select a framework:",
    options: [
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
        { value: "svelte", label: "Svelte" },
    ],
});

// With hints
const environment = await radio({
    label: "Select environment:",
    options: [
        { value: "dev", label: "Development", hint: "For local testing" },
        { value: "stage", label: "Staging", hint: "Pre-production testing" },
        { value: "prod", label: "Production", hint: "Live environment" },
    ],
    hintPosition: "inline",
});

// Searchable with limited visible options
const country = await radio({
    label: "Select country:",
    options: countries, // Large list
    searchable: true,
    maxVisible: 10,
});
```

## Options

| Prop           | Type                                               | Default  | Description                                 |
| -------------- | -------------------------------------------------- | -------- | ------------------------------------------- |
| `label`        | `string`                                           | Required | The question to display                     |
| `shortLabel`   | `string`                                           | -        | Shorter label for completed state           |
| `options`      | `RadioOption[]`                                    | `[]`     | List of options to choose from              |
| `initialValue` | `string`                                           | -        | Pre-selected value                          |
| `showNumbers`  | `boolean`                                          | `false`  | Show numbers for quick selection            |
| `allowLoop`    | `boolean`                                          | `true`   | Whether arrow keys wrap around              |
| `searchable`   | `boolean`                                          | `false`  | Enable search filtering                     |
| `hintPosition` | `"bottom" \| "inline" \| "side" \| "inline-fixed"` | -        | Position of hint text                       |
| `maxVisible`   | `number`                                           | -        | Maximum options visible (enables scrolling) |

## Keyboard Controls

| Key             | Action                                          |
| --------------- | ----------------------------------------------- |
| `Up/Down Arrow` | Navigate options                                |
| `Return`        | Confirm selection                               |
| `Escape`        | Go back (if allowed)                            |
| `1-9`           | Quick select by number (if `showNumbers: true`) |
| `Type`          | Search (if `searchable: true`)                  |
| `Backspace`     | Delete search character                         |

## Types

```ts
interface RadioOption {
    value: string;
    label: string;
    color?: string;
    hint?: string;
}

interface RadioOptions {
    label: string;
    shortLabel?: string;
    options: RadioOption[];
    showNumbers?: boolean;
    allowLoop?: boolean;
    searchable?: boolean;
    hintPosition?: "bottom" | "inline" | "side" | "inline-fixed";
    maxVisible?: number;
    initialValue?: string;
}
```
