# Note

The note plugin displays informational messages with markdown support that automatically advance without requiring user interaction.

## Usage

```ts
import { note, md } from "askeroo";

// Basic note
await note("Installation complete!");

// Markdown note
await note(md`
    ## Welcome!

    Your setup is **complete**. You can now:

    -   Run your application
    -   View documentation
    -   Configure settings
`);
```

## Options

| Prop      | Type                       | Default  | Description            |
| --------- | -------------------------- | -------- | ---------------------- |
| `message` | `string \| MarkdownString` | Required | The message to display |

## Types

```ts
interface NoteOptions {
    message: string | MarkdownString;
}
```
