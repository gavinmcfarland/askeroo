# Group

The group function organizes and structures prompts into logical groups with support for progressive, phased, and static execution flows.

**Note:** Groups are NOT plugins - they are structural elements rendered by `RecursiveGroupContainer`.

## Usage

```ts
import { ask, group, text } from "askeroo";

// Progressive group (default) - reveal fields as user completes them
const userInfo = await group(
    async () => {
        const name = await text({ label: "Name" });
        const email = await text({ label: "Email" });
        const age = await text({ label: "Age" });
        return { name, email, age };
    },
    { label: "User Information" }
);

// Static group - display all fields upfront
const settings = await group(
    async () => {
        const theme = await text({ label: "Theme" });
        const language = await text({ label: "Language" });
        return { theme, language };
    },
    {
        label: "Settings",
        flow: "static",
        enableArrowNavigation: true,
    }
);

// Phased group - show one field at a time
const credentials = await group(
    async () => {
        const username = await text({ label: "Username" });
        const password = await text({ label: "Password" });
        return { username, password };
    },
    {
        label: "Credentials",
        flow: "phased",
    }
);
```

## Options

| Prop                    | Type                                    | Default         | Description                                |
| ----------------------- | --------------------------------------- | --------------- | ------------------------------------------ |
| `label`                 | `string`                                | -               | Label for the group                        |
| `id`                    | `string`                                | Auto-generated  | Custom ID for the group                    |
| `flow`                  | `"progressive" \| "phased" \| "static"` | `"progressive"` | Execution flow type                        |
| `enableArrowNavigation` | `boolean`                               | `false`         | Enable arrow navigation (static flow only) |

## Flow Types

| Flow Type     | Description                                            |
| ------------- | ------------------------------------------------------ |
| `progressive` | Fields are progressively revealed as user answers them |
| `phased`      | Only one field is visible at a time                    |
| `static`      | All fields are discovered and displayed upfront        |

## Types

```ts
interface GroupMeta {
    label?: string;
    id?: string;
}

interface GroupOpts {
    flow?: "progressive" | "phased" | "static";
    enableArrowNavigation?: boolean;
}

function group<T>(
    body: () => Promise<T>,
    options?: GroupMeta & GroupOpts
): Promise<T>;
```
