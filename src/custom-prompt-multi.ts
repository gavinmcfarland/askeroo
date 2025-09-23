import { createPlugin } from './registry.js';
import { MultiField } from './plugins/multi/MultiField.js';

export interface MultiOptions {
  message: string;
  options?: string[];
}

// Example multi-select prompt plugin
export const multi = createPlugin<MultiOptions, string[]>({
  type: 'multi',
  component: MultiField, // Plugin provides its own component

  // The prompt logic - called by the engine
  async prompt(opts: MultiOptions, { extendedUI, currentGroup }, id: string) {
    // Call the UI handler with the provided options
    return extendedUI.multi(opts.message, opts.options || [], currentGroup, id);
  },

  // No uiHandler needed - the UI will be handled by PromptApp components
  uiHandler: {}
});