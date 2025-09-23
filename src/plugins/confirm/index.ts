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

  // The prompt logic - called by the engine
  async prompt(opts: ConfirmOptions, { extendedUI, currentGroup }, id: string) {
    return extendedUI.confirm(
      opts.message,
      undefined,
      currentGroup,
      id
    );
  },

  // No uiHandler needed - the UI will be handled by PromptApp components
  uiHandler: {}
});