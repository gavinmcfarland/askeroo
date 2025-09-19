import React from "react";
import { render } from "ink";
import { PromptApp } from "./fields/index.js";

type BackToken = { __back: true };

type PromptRequest =
  | { type: 'text'; message: string; initial?: string }
  | { type: 'confirm'; message: string; initial?: boolean }
  | { type: 'group'; message: string };

let appInstance: {
  promptFn?: (request: PromptRequest) => Promise<any>;
  unmount?: () => void;
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
  async text(msg: string, initial?: string): Promise<string | BackToken> {
    const promptFn = await ensureApp();
    return promptFn({ type: 'text', message: msg, initial });
  },

  async confirm(msg: string, initial?: boolean): Promise<boolean | BackToken> {
    const promptFn = await ensureApp();
    return promptFn({ type: 'confirm', message: msg, initial });
  },

  async showGroup(label: string): Promise<void> {
    const promptFn = await ensureApp();
    await promptFn({ type: 'group', message: label });
    // Brief delay to show the group header
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};
