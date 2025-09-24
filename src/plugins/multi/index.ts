import { createPlugin } from '../../registry.js';
import { MultiField } from './MultiField.js';

export interface MultiOptions {
  message: string;
  options?: string[];
}

// Example multi-select prompt plugin
export const multi = createPlugin<MultiOptions, string[]>({
  type: 'multi',
  component: MultiField, // Plugin provides its own component

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: MultiOptions, { currentGroup }, id: string) {
    return opts;
  },
});