# Confirm

The confirm plugin provides flexible confirmation prompts with support for Yes/No questions and custom options.

## Usage

```ts
import { confirm } from "askeroo";

const proceed = await confirm({
    message: "Continue with deployment?",
    initialValue: true,
});
```

## Options

| Prop           | Type              | Default                                                      | Description                    |
| -------------- | ----------------- | ------------------------------------------------------------ | ------------------------------ |
| `label`        | `string`          | Required                                                     | The question to ask            |
| `options`      | `ConfirmOption[]` | `[{value: true, label: "Yes"}, {value: false, label: "No"}]` | Custom options                 |
| `allowLoop`    | `boolean`         | `true`                                                       | Whether arrow keys wrap around |
| `initialValue` | `any`             | First option value                                           | Pre-selected value             |

## Keyboard Controls

| Key                | Action               |
| ------------------ | -------------------- |
| `Left/Right Arrow` | Navigate options     |
| `Up/Down Arrow`    | Navigate options     |
| `Return`           | Confirm selection    |
| `Escape`           | Go back (if allowed) |

## Types

```ts
interface ConfirmOptions {
    message?: string;
    label?: string;
    options?: ConfirmOption[];
    allowLoop?: boolean;
    initialValue?: any;
}

interface ConfirmOption {
    value: any;
    label: string;
}
```
