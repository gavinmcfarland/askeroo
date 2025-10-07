# Multi

Provides a multi-select interface for choosing multiple options from a list with support for search, scrolling, and quick number selection.

## Usage

```ts
import { multi } from "askeroo";

// Basic usage with string array
const skills = await multi({
    label: "Select your skills:",
    options: ["JavaScript", "TypeScript", "React", "Vue"],
});

// With detailed options
const languages = await multi({
    label: "Select programming languages:",
    options: [
        { value: "js", label: "JavaScript", hint: "Web scripting" },
        { value: "ts", label: "TypeScript", hint: "Typed JavaScript" },
        { value: "py", label: "Python", hint: "General purpose" },
    ],
});

// With none option
const frameworks = await multi({
    label: "Select frameworks:",
    options: ["React", "Vue", "Angular", "Svelte"],
    noneOption: { label: "None of the above" },
});

// Searchable with scrolling
const countries = await multi({
    label: "Select countries:",
    options: allCountries, // Large list
    searchable: true,
    maxVisible: 10,
    showNumbers: true,
});

// With initial selection
const tools = await multi({
    label: "Select tools:",
    options: ["Git", "Docker", "Kubernetes", "Jenkins"],
    initialValue: ["Git", "Docker"],
});
```

## Options

| Prop                | Type                                               | Default  | Description                                 |
| ------------------- | -------------------------------------------------- | -------- | ------------------------------------------- |
| `label` / `message` | `string`                                           | Required | The question to display                     |
| `shortLabel`        | `string`                                           | -        | Shorter label for completed state           |
| `options`           | `string[] \| MultiFieldOption[]`                   | `[]`     | List of options (strings or objects)        |
| `initialValue`      | `string[]`                                         | `[]`     | Pre-selected values                         |
| `noneOption`        | `{ label: string }`                                | -        | Add "none" option that deselects all        |
| `showNumbers`       | `boolean`                                          | `false`  | Show numbers for quick toggle               |
| `allowLoop`         | `boolean`                                          | `true`   | Whether arrow keys wrap around              |
| `searchable`        | `boolean`                                          | `false`  | Enable search filtering                     |
| `hintPosition`      | `"bottom" \| "inline" \| "side" \| "inline-fixed"` | -        | Position of hint text                       |
| `maxVisible`        | `number`                                           | -        | Maximum options visible (enables scrolling) |

## Keyboard Controls

| Key             | Action                                          |
| --------------- | ----------------------------------------------- |
| `Up/Down Arrow` | Navigate options                                |
| `Space`         | Toggle current option                           |
| `Return`        | Submit selection                                |
| `Escape`        | Go back (if allowed)                            |
| `1-9`           | Quick toggle by number (if `showNumbers: true`) |
| `Type`          | Search (if `searchable: true`)                  |
| `Backspace`     | Delete search character                         |

## Types

```ts
interface MultiFieldOption {
    value: string;
    label: string;
    color?: string;
    hint?: string;
}

interface MultiOptions {
    label?: string;
    message?: string;
    shortLabel?: string;
    options?: string[] | MultiFieldOption[];
    initialValue?: string[];
    noneOption?: { label: string };
    showNumbers?: boolean;
    allowLoop?: boolean;
    searchable?: boolean;
    hintPosition?: "bottom" | "inline" | "side" | "inline-fixed";
    maxVisible?: number;
}
```
