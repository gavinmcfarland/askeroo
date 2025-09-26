import { createPlugin } from '../../registry.js';
import { MultiField } from './MultiField.js';

export interface MultiOption {
  value: string;
  label: string;
  color?: string;
  hint?: string;
}

export interface MultiOptions {
  message?: string;
  label?: string;
  shortLabel?: string;
  options?: string[] | MultiOption[];
  initialValue?: string[];
  noneOption?: {
    label: string;
  };
  showNumbers?: boolean;
  allowLoop?: boolean;
  searchable?: boolean;
  hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
}

// Example multi-select prompt plugin
export const multi = createPlugin<MultiOptions, string[]>({
  type: 'multi',
  component: MultiField, // Plugin provides its own component

  // The prompt logic - just return the options, runtime handles UI
  prompt(opts: MultiOptions, context: { currentGroup?: string; saveOnEscape?: boolean; existingAnswer?: any }, id: string) {
    // Use existing answer as initial value if available
    const initialValue = context.existingAnswer !== undefined ? context.existingAnswer : opts.initialValue;
    return { ...opts, initialValue, saveOnEscape: context.saveOnEscape };
  },
});