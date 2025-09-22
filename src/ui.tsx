import React from "react";
import { render } from "ink";
import { PromptApp } from "./prompts/shared/PromptApp.js";

type BackToken = { __back: true };

type PromptRequest =
  | { type: 'text'; id: string; message: string; initial?: string; groupName?: string }
  | { type: 'confirm'; id: string; message: string; initial?: boolean; groupName?: string }
  | { type: 'group'; id: string; message: string; flow?: 'phase' };

// Generate stable IDs for prompts based on content and context
const generatePromptId = (type: string, message: string, groupName?: string) => {
  const parts = [type, message];
  if (groupName) parts.push(`group:${groupName}`);
  return parts.join('|');
};

let appInstance: {
  promptFn?: (request: PromptRequest) => Promise<any>;
  unmount?: () => void;
  currentGroup?: string;
} = {};

function ensureApp(): Promise<(request: PromptRequest) => Promise<any>> {
  return new Promise((resolve) => {
    if (appInstance.promptFn) {
      resolve(appInstance.promptFn);
      return;
    }

    const { unmount } = render(
      <PromptApp
        onReady={(promptFn) => {
          appInstance.promptFn = promptFn;
          appInstance.unmount = unmount;
          resolve(promptFn);
        }}
      />
    );
  });
}

export const ui = {
  async text(msg: string, initial?: string, groupContext?: string, id?: string): Promise<string | BackToken> {
    if (groupContext) {
      appInstance.currentGroup = groupContext;
    }
    const promptFn = await ensureApp();
    return promptFn({ type: 'text', id: id || generatePromptId('text', msg), message: msg, initial, groupName: appInstance.currentGroup });
  },

  async confirm(msg: string, initial?: boolean, groupContext?: string, id?: string): Promise<boolean | BackToken> {
    if (groupContext) {
      appInstance.currentGroup = groupContext;
    }
    const promptFn = await ensureApp();
    return promptFn({ type: 'confirm', id: id || generatePromptId('confirm', msg), message: msg, initial, groupName: appInstance.currentGroup });
  },

  async showGroup(label: string, flow?: 'phase'): Promise<void> {
    appInstance.currentGroup = label;
    const promptFn = await ensureApp();
    await promptFn({ type: 'group', id: generatePromptId('group', label), message: label, flow });
  },

  clearGroup(): void {
    appInstance.currentGroup = undefined;
  },

  cleanup(): void {
    if (appInstance.unmount) {
      appInstance.unmount();
      appInstance.promptFn = undefined;
      appInstance.unmount = undefined;
      appInstance.currentGroup = undefined;
    }
  }
};
