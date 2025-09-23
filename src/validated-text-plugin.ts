import { createPlugin } from './registry.js';
import { ValidatedTextField } from './plugins/validated-text/ValidatedTextField.js';

interface ValidatedTextOptions {
  message: string;
  validate?: (value: string) => string | true; // Return error message or true if valid
  transform?: (value: string) => string; // Transform the input
}

// Example validated text input plugin
export const validatedText = createPlugin({
  type: 'validatedText',
  component: ValidatedTextField, // Plugin provides its own component

  // The prompt logic - called by the engine
  async prompt(opts: ValidatedTextOptions, { extendedUI, currentGroup }, id: string) {
    return extendedUI.validatedText(
      opts.message,
      opts.validate,
      opts.transform,
      currentGroup,
      id
    );
  },

  // No uiHandler needed - the UI will be handled by PromptApp components
  uiHandler: {}
});