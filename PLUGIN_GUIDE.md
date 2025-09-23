# Plugin Development Guide

## Creating Custom Prompts

You can create custom prompts that work seamlessly with the existing API. Users can import and use your custom prompts just like built-in ones.

### Basic Plugin Structure

```javascript
import { createPlugin } from 'askeroo/plugin';

export const myPrompt = createPlugin({
  type: 'myPrompt',

  // The prompt logic - called by the engine
  async prompt(opts, { extendedUI, currentGroup }, id) {
    return extendedUI.myPrompt(opts.message, opts.customOption, currentGroup, id);
  },

  // UI handler - extends the UI system
  uiHandler: {
    async myPrompt(msg, customOption, groupContext, id) {
      // Your custom UI implementation here
      // Return the result or throw BackToken for navigation
      return result;
    }
  }
});
```

### Example: Multi-Select Prompt

```javascript
// custom-prompt-multi.js
import { createPlugin } from 'askeroo/plugin';

export const multi = createPlugin({
  type: 'multi',

  async prompt(opts, { extendedUI, currentGroup }, id) {
    return extendedUI.multi(opts.message, opts.options || [], currentGroup, id);
  },

  uiHandler: {
    async multi(msg, options, groupContext, id) {
      // Custom multi-select UI implementation
      console.log(msg);
      console.log('Options:', options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'));

      // Return selected items array
      return [options[0]]; // Demo implementation
    }
  }
});
```

### Usage in Consumer Code

```javascript
import { ask, text } from 'askeroo';
import { multi } from './custom-prompt-multi.js';

const flow = async () => {
  const name = await text({ message: "Name" });

  // Use custom prompt exactly like built-in ones
  const colors = await multi({
    message: "Select colors",
    options: ["red", "green", "blue"]
  });

  return { name, colors };
};

ask(flow).then(console.log);
```

## Key Features

- **Auto-registration**: Plugins register themselves when imported
- **Zero boilerplate**: Users don't need any setup code
- **Type safety**: Full TypeScript support
- **Seamless integration**: Works with groups, navigation, and all existing features

## Plugin API

### `createPlugin(config)`

- `config.type` (string): Unique prompt type name
- `config.prompt` (function): Engine-level prompt handler
- `config.uiHandler` (object): UI extension methods

### Parameters passed to `prompt()`:

1. `opts`: Options passed by the user
2. `{ extendedUI, currentGroup }`: Runtime context
3. `id`: Unique prompt identifier

### UI Handler Signature:

```typescript
async handlerName(message, ...customArgs, groupContext, id): Promise<result | BackToken>
```

## Best Practices

1. **Consistent naming**: Use clear, descriptive prompt names
2. **Error handling**: Validate inputs and provide helpful error messages
3. **Navigation support**: Handle BackToken for consistent navigation
4. **TypeScript**: Export types for better developer experience
5. **Documentation**: Include usage examples and option descriptions