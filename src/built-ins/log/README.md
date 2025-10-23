# Log

Displays log messages with different levels and colored symbols that automatically advance without requiring user interaction.

## Usage

```ts
import { log, logInfo, logWarn, logError, logSuccess } from "askeroo";

// Using individual functions
await logInfo("Application started successfully");
await logWarn("This feature is deprecated");
await logError("Failed to connect to database");
await logSuccess("Data saved successfully");

// Using the log object methods
await log.info("User logged in");
await log.warn("Memory usage is high");
await log.error("Connection timeout");
await log.success("Backup completed");

// With markdown support
await logInfo("
    ## Installation Complete!

    Your application has been **successfully** installed.

    Next steps:
    -   Run `npm start` to begin
    -   Check the documentation
    -   Configure your settings
"");
```

## Log Levels

| Level     | Symbol | Color  | Description                  |
| --------- | ------ | ------ | ---------------------------- |
| `info`    | ●      | Blue   | General information messages |
| `warn`    | ▲      | Yellow | Warning messages             |
| `error`   | ■      | Red    | Error messages               |
| `success` | ■      | Green  | Success messages             |

## API

### Functions

-   `logInfo(message, options?)` - Info level logging
-   `logWarn(message, options?)` - Warning level logging
-   `logError(message, options?)` - Error level logging
-   `logSuccess(message, options?)` - Success level logging

### Object Methods

-   `log.info(message, options?)` - Info level logging
-   `log.warn(message, options?)` - Warning level logging
-   `log.error(message, options?)` - Error level logging
-   `log.success(message, options?)` - Success level logging

## Options

| Prop      | Type                       | Default  | Description            |
| --------- | -------------------------- | -------- | ---------------------- |
| `message` | `string \| MarkdownString` | Required | The message to display |
| `level`   | `LogLevel`                 | `"info"` | The log level          |

## Types

```ts
type LogLevel = "info" | "warn" | "error" | "success";

interface LogOptions {
    message: string | MarkdownString;
    level?: LogLevel;
}
```
