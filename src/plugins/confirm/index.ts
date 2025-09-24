import { createPlugin } from '../../registry.js';
import { ConfirmField } from './ConfirmField.js';

export interface ConfirmOptions {
  message: string;
  id?: string;
}

// Core confirm input plugin
export const confirm = createPlugin<ConfirmOptions, boolean>({
  type: 'confirm',
  component: ConfirmField,

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: ConfirmOptions, { currentGroup }, id: string) {
    return opts;
  },
});