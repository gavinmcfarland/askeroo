import { render } from 'ink';
import React from 'react';
import { FlowManager } from './flow-manager.js';
import type { FlowFunction, FieldConfig, GroupConfig, TextFieldConfig, ConfirmFieldConfig } from './types.js';
import { PromptApp } from './components/PromptApp.js';

let globalFlowManager: FlowManager | null = null;

// Global state for current prompt
let currentPromptResolve: ((value: any) => void) | null = null;
let currentPromptConfig: any = null;
let currentPromptType: 'text' | 'confirm' | null = null;
let flowExecutionStarted: boolean = false;

// Simple back navigation state
interface PromptHistoryEntry {
  type: 'text' | 'confirm';
  config: any;
  value: any;
}

let promptHistory: PromptHistoryEntry[] = [];
let currentPromptIndex: number = -1; // -1 means "next new prompt", 0+ means "at history index N"

export async function ask<T>(flowFn: FlowFunction<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let appUnmounted = false;

    // Reset back navigation state
    promptHistory = [];
    currentPromptIndex = -1;

    const cleanup = () => {
      if (appUnmounted) return;
      appUnmounted = true;

      // Restore stdin
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      process.stdin.pause();

      // Remove any remaining listeners
      process.stdin.removeAllListeners('data');

      // Clear history
      promptHistory = [];
      currentPromptIndex = -1;
    };

    try {
      globalFlowManager = new FlowManager();

      // Render the Ink app
      const { unmount } = render(
        React.createElement(PromptApp, {
          flowManager: globalFlowManager,
          flowFunction: flowFn,
          onComplete: (result: T) => {
            cleanup();
            unmount();
            resolve(result);
          },
          onError: (error: Error) => {
            cleanup();
            unmount();
            reject(error);
          },
          onExit: () => {
            cleanup();
            unmount();

            // Exit gracefully with exit code 130 (Ctrl+C)
            console.log('\n👋 Goodbye!');
            process.exit(130);
          }
        })
      );

      // Handle process signals
      const handleSignal = () => {
        if (!appUnmounted) {
          cleanup();
          unmount();
          console.log('\n👋 Goodbye!');
          process.exit(130);
        }
      };

      process.once('SIGINT', handleSignal);
      process.once('SIGTERM', handleSignal);

    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

export async function text(config: TextFieldConfig): Promise<string> {
  if (!globalFlowManager) {
    throw new Error('text() can only be called within an ask() flow');
  }

  console.log(`🔹 text() called: ${config.message}, currentPromptIndex: ${currentPromptIndex}, historyLength: ${promptHistory.length}`);

  // Check if we should use a value from history
  if (currentPromptIndex >= 0 && currentPromptIndex < promptHistory.length) {
    const historyEntry = promptHistory[currentPromptIndex];
    console.log(`🔸 Checking history entry ${currentPromptIndex}: ${historyEntry.config.message} vs ${config.message}`);

    if (historyEntry.type === 'text' && promptsMatch(historyEntry.config, config)) {
      console.log(`🔸 Using historical value: ${historyEntry.value}`);
      currentPromptIndex++;
      return historyEntry.value;
    }
  }

  // This is a new prompt or we're at the target prompt
  return new Promise((resolve) => {
    const wrappedResolve = (value: string) => {
      console.log(`🔸 User entered value: ${value}`);

      if (currentPromptIndex >= 0) {
        // We're replacing a value in history
        console.log(`🔸 Updating history at index ${currentPromptIndex}`);
        if (currentPromptIndex < promptHistory.length) {
          promptHistory[currentPromptIndex].value = value;
        } else {
          // Extending history
          promptHistory.push({
            type: 'text',
            config: { ...config },
            value
          });
        }
        // Truncate any future history
        promptHistory.length = currentPromptIndex + 1;
        currentPromptIndex = -1; // Move to "forward" mode
      } else {
        // We're adding a new prompt to history
        promptHistory.push({
          type: 'text',
          config: { ...config },
          value
        });
      }

      resolve(value);
    };

    currentPromptResolve = wrappedResolve;
    currentPromptConfig = config;
    currentPromptType = 'text';
  });
}

export async function confirm(config: ConfirmFieldConfig): Promise<boolean> {
  if (!globalFlowManager) {
    throw new Error('confirm() can only be called within an ask() flow');
  }

  console.log(`🔹 confirm() called: ${config.message}, currentPromptIndex: ${currentPromptIndex}, historyLength: ${promptHistory.length}`);

  // Check if we should use a value from history
  if (currentPromptIndex >= 0 && currentPromptIndex < promptHistory.length) {
    const historyEntry = promptHistory[currentPromptIndex];
    console.log(`🔸 Checking history entry ${currentPromptIndex}: ${historyEntry.config.message} vs ${config.message}`);

    if (historyEntry.type === 'confirm' && promptsMatch(historyEntry.config, config)) {
      console.log(`🔸 Using historical value: ${historyEntry.value}`);
      currentPromptIndex++;
      return historyEntry.value;
    }
  }

  // This is a new prompt or we're at the target prompt
  return new Promise((resolve) => {
    const wrappedResolve = (value: boolean) => {
      console.log(`🔸 User entered value: ${value}`);

      if (currentPromptIndex >= 0) {
        // We're replacing a value in history
        console.log(`🔸 Updating history at index ${currentPromptIndex}`);
        if (currentPromptIndex < promptHistory.length) {
          promptHistory[currentPromptIndex].value = value;
        } else {
          // Extending history
          promptHistory.push({
            type: 'confirm',
            config: { ...config },
            value
          });
        }
        // Truncate any future history
        promptHistory.length = currentPromptIndex + 1;
        currentPromptIndex = -1; // Move to "forward" mode
      } else {
        // We're adding a new prompt to history
        promptHistory.push({
          type: 'confirm',
          config: { ...config },
          value
        });
      }

      resolve(value);
    };

    currentPromptResolve = wrappedResolve;
    currentPromptConfig = config;
    currentPromptType = 'confirm';
  });
}

export async function group<T>(config: GroupConfig, fn: () => Promise<T>): Promise<T> {
  if (!globalFlowManager) {
    throw new Error('group() can only be called within an ask() flow');
  }

  // This will be intercepted by the PromptApp component during flow execution
  // For now, execute the function directly
  return await fn();
}

// Export the flow manager for internal use
export function getFlowManager(): FlowManager | null {
  return globalFlowManager;
}

// Functions for PromptApp to interact with current prompt
export function getCurrentPrompt(): { type: typeof currentPromptType; config: any } | null {
  if (!currentPromptType || !currentPromptConfig) return null;
  return {
    type: currentPromptType,
    config: currentPromptConfig
  };
}

export function resolveCurrentPrompt(value: any): void {
  if (currentPromptResolve) {
    const resolve = currentPromptResolve;

    // Clear current prompt state
    currentPromptResolve = null;
    currentPromptConfig = null;
    currentPromptType = null;

    // Resolve the promise
    resolve(value);
  }
}

export function hasCurrentPrompt(): boolean {
  return currentPromptResolve !== null;
}

// Helper function to check if two prompt configs match
function promptsMatch(config1: any, config2: any): boolean {
  return config1.message === config2.message;
}

// Back navigation functions
export function canGoBack(): boolean {
  return promptHistory.length > 0;
}

export function goBack(): boolean {
  console.log(`🔹 goBack() called, canGoBack: ${canGoBack()}, historyLength: ${promptHistory.length}, currentPromptIndex: ${currentPromptIndex}`);

  if (!canGoBack()) {
    return false;
  }

  // Determine where to go back to
  if (currentPromptIndex === -1) {
    // We're at a "new" prompt, go back to the last prompt in history
    currentPromptIndex = promptHistory.length - 1;
  } else if (currentPromptIndex > 0) {
    // We're in history, go back one more step
    currentPromptIndex--;
  } else {
    // Already at first prompt
    console.log(`🔸 Cannot go back further - already at first prompt`);
    return false;
  }

  console.log(`🔸 Going back to prompt index ${currentPromptIndex}: ${promptHistory[currentPromptIndex]?.config.message}`);

  // Clear current prompt and trigger re-execution
  currentPromptResolve = null;
  currentPromptConfig = null;
  currentPromptType = null;

  return true;
}

export function getPromptHistory(): PromptHistoryEntry[] {
  return [...promptHistory];
}

export function resetBackNavigation(): void {
  currentPromptIndex = -1;
}