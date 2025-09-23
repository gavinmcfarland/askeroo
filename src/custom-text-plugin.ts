import { createPlugin } from './registry.js';

interface CustomTextOptions {
  message: string;
  placeholder?: string;
  prefix?: string;
}

// Example custom text input plugin with different styling
export const customText = createPlugin({
  type: 'customText',

  // The prompt logic - called by the engine
  async prompt(opts: CustomTextOptions, { extendedUI, currentGroup }, id: string) {
    return extendedUI.customText(
      opts.message,
      opts.placeholder || '',
      opts.prefix || '→',
      currentGroup,
      id
    );
  },

  // No uiHandler needed - the UI will be handled by PromptApp components
  uiHandler: {}
});