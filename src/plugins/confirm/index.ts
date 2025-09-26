import { createPlugin } from '../../registry.js';
import { EnhancedConfirmField, ConfirmOption } from './EnhancedConfirmField.js';

export interface ConfirmOptions {
  message?: string;
  label?: string; // Alternative to message for compatibility
  shortLabel?: string;
  options?: ConfirmOption[];
  allowLoop?: boolean;
  initialValue?: any;
  id?: string;
}

export type { ConfirmOption } from './EnhancedConfirmField.js';

// Enhanced confirm input plugin with custom options support
export const confirm = createPlugin<ConfirmOptions, any>({
  type: 'confirm',
  component: EnhancedConfirmField,

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: ConfirmOptions, { currentGroup }, id: string) {
    return opts;
  },
});