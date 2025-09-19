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

export async function ask<T>(flowFn: FlowFunction<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    let appUnmounted = false;

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

  return new Promise((resolve) => {
    currentPromptResolve = resolve;
    currentPromptConfig = config;
    currentPromptType = 'text';
  });
}

export async function confirm(config: ConfirmFieldConfig): Promise<boolean> {
  if (!globalFlowManager) {
    throw new Error('confirm() can only be called within an ask() flow');
  }

  return new Promise((resolve) => {
    currentPromptResolve = resolve;
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