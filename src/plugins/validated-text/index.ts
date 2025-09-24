import { createPlugin } from '../../registry.js';
import { ValidatedTextField } from './ValidatedTextField.js';

export interface ValidatedTextOptions {
  message: string;
  validate?: (value: string) => string | true; // Return error message or true if valid
  transform?: (value: string) => string; // Transform the input
}

// Example validated text input plugin
export const validatedText = createPlugin<ValidatedTextOptions, string>({
  type: 'validatedText',
  component: ValidatedTextField, // Plugin provides its own component

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: ValidatedTextOptions, { currentGroup }, id: string) {
    return opts;
  },
});