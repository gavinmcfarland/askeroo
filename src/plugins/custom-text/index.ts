import { createPlugin } from '../../registry.js';
import { CustomTextField } from './CustomTextField.js';

export interface CustomTextOptions {
  message?: string;
  placeholder?: string;
  prefix?: string;
}

// Example custom text input plugin with different styling
export const customText = createPlugin<CustomTextOptions, string>({
  type: 'customText',
  component: CustomTextField, // Plugin provides its own component

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: CustomTextOptions, { currentGroup }, id: string) {
    return opts;
  },
});