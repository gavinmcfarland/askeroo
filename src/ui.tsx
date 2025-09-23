import React from "react";
import { render } from "ink";
import { PromptApp } from "./prompts/shared/PromptApp.js";
import { debugLogger } from "./debug.js";

type BackToken = { __back: true };

type PromptRequest =
  | { type: 'text'; id: string; message: string; initial?: string; groupName?: string }
  | { type: 'confirm'; id: string; message: string; initial?: boolean; groupName?: string }
  | { type: 'customText'; id: string; message: string; placeholder?: string; prefix?: string; groupName?: string }
  | { type: 'validatedText'; id: string; message: string; validate?: (value: string) => string | true; transform?: (value: string) => string; groupName?: string }
  | { type: 'multi'; id: string; message: string; options?: string[]; groupName?: string }
  | { type: 'group'; id: string; message?: string; flow?: 'phase' | 'static'; discoveredFields?: Array<{id: string, message: string, type: string}> };

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

// Store reference to the runtime for re-discovery
let currentRuntime: any = null;

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

  async customText(msg: string, placeholder?: string, prefix?: string, groupContext?: string, id?: string): Promise<string | BackToken> {
    if (groupContext) {
      appInstance.currentGroup = groupContext;
    }
    const promptFn = await ensureApp();
    return promptFn({ type: 'customText', id: id || generatePromptId('customText', msg), message: msg, placeholder, prefix, groupName: appInstance.currentGroup });
  },

  async validatedText(msg: string, validate?: (value: string) => string | true, transform?: (value: string) => string, groupContext?: string, id?: string): Promise<string | BackToken> {
    if (groupContext) {
      appInstance.currentGroup = groupContext;
    }
    const promptFn = await ensureApp();
    return promptFn({ type: 'validatedText', id: id || generatePromptId('validatedText', msg), message: msg, validate, transform, groupName: appInstance.currentGroup });
  },

  async multi(msg: string, options?: string[], groupContext?: string, id?: string): Promise<string[] | BackToken> {
    if (groupContext) {
      appInstance.currentGroup = groupContext;
    }
    const promptFn = await ensureApp();
    return promptFn({ type: 'multi', id: id || generatePromptId('multi', msg), message: msg, options, groupName: appInstance.currentGroup });
  },

  async showGroup(label: string | undefined, flow?: 'phase' | 'static', id?: string, discoveredFields?: Array<{id: string, message: string, type: string}>): Promise<void> {
    appInstance.currentGroup = label;
    const promptFn = await ensureApp();
    await promptFn({ type: 'group', id: id || generatePromptId('group', label || 'group'), message: label, flow, discoveredFields });
  },

  clearGroup(): void {
    appInstance.currentGroup = undefined;
  },

  cleanup(): void {
    if (appInstance.unmount) {
      debugLogger.log('UI_CLEANUP', 'UI cleanup triggered');
      appInstance.unmount();
      appInstance.promptFn = undefined;
      appInstance.unmount = undefined;
      appInstance.currentGroup = undefined;
      // Show debug file location when UI cleanup happens (user exiting)
      debugLogger.cleanup();
    }
  },

  // Set the runtime reference for re-discovery
  setRuntime(runtime: any): void {
    currentRuntime = runtime;
  },

  // Trigger re-discovery for a static group
  async rediscoverStaticGroup(groupId: string) {
    if (currentRuntime?.rediscoverStaticGroupFields) {
      return await currentRuntime.rediscoverStaticGroupFields(groupId);
    }
    return null;
  }
};
