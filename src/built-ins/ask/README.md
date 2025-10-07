# Ask

Enables runtime execution of prompt flows, creating and managing the runtime context, handling prompt sequencing, state management and navigation.

## Usage

```ts
import { ask } from "askeroo";

const result = await ask(async () => {
    const name = await text({ label: "What's your name?" });
    const confirmed = await confirm({ label: "Is this correct?" });
    return { name, confirmed };
});
```

## Options

| Prop   | Type               | Default  | Description                  |
| ------ | ------------------ | -------- | ---------------------------- |
| `flow` | `() => Promise<T>` | Required | The flow function to execute |

## Types

```ts
function ask<T>(flow: () => Promise<T>): Promise<T>;
```
