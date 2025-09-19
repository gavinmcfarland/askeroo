import { render } from 'ink';
import React from 'react';
import { FlowManager } from './flow-manager.js';
import type { FlowFunction, FieldConfig, GroupConfig, TextFieldConfig, ConfirmFieldConfig } from './types.js';
import { EnhancedPromptApp } from './components/PromptApp-enhanced.js';
import { FlowStateManager } from './flow-state/FlowStateManager.js';
import { ReplayEngine } from './flow-state/ReplayEngine.js';
import { ConditionalManager } from './flow-state/ConditionalManager.js';
import { FlowReplayOptions, PromptConfig, GroupConfig as EnhancedGroupConfig } from './flow-state/types.js';

// Global state for enhanced flow execution
let globalFlowManager: FlowManager | null = null;
let globalStateManager: FlowStateManager | null = null;
let globalReplayEngine: ReplayEngine | null = null;
let globalConditionalManager: ConditionalManager | null = null;

// Current prompt state (for compatibility)
let currentPromptResolve: ((value: any) => void) | null = null;
let currentPromptConfig: any = null;
let currentPromptType: 'text' | 'confirm' | null = null;

// Enhanced ask function with back navigation support
export async function ask<T>(
  flowFn: FlowFunction<T>,
  options: FlowReplayOptions = {}
): Promise<T> {
  const { enableBackNavigation = false, maxHistorySteps = 50, debugMode = false } = options;

  return new Promise((resolve, reject) => {
    let appUnmounted = false;

    // Initialize enhanced state management if back navigation is enabled
    if (enableBackNavigation) {
      globalStateManager = new FlowStateManager();
      globalReplayEngine = new ReplayEngine(globalStateManager);
      globalConditionalManager = new ConditionalManager();
    } else {
      globalStateManager = null;
      globalReplayEngine = null;
      globalConditionalManager = null;
    }

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

      // Clean up enhanced state
      if (globalStateManager) globalStateManager.reset();
      if (globalReplayEngine) globalReplayEngine.reset();
      if (globalConditionalManager) globalConditionalManager.clear();
    };

    try {
      globalFlowManager = new FlowManager();

      // Render the enhanced Ink app
      const { unmount } = render(
        React.createElement(EnhancedPromptApp, {
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
            console.log('\n👋 Goodbye!');
            process.exit(130);
          },
          // Enhanced props
          enableBackNavigation,
          stateManager: globalStateManager,
          replayEngine: globalReplayEngine,
          debugMode
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

// Enhanced text function with state tracking
export async function text(config: TextFieldConfig & PromptConfig): Promise<string> {
  if (!globalFlowManager) {
    throw new Error('text() can only be called within an ask() flow');
  }

  return new Promise((resolve) => {
    let stepId: string | undefined;

    // Capture state if back navigation is enabled
    if (globalStateManager) {
      stepId = globalStateManager.capturePromptState('text', config);

      // Check for replay value
      if (globalReplayEngine) {
        const replayValue = globalReplayEngine.getReplayValue(config);
        if (replayValue !== undefined) {
          globalStateManager.recordPromptValue(stepId, replayValue);
          resolve(replayValue);
          return;
        }
      }
    }

    const wrappedResolve = (value: string) => {
      // Record value in state if tracking is enabled
      if (globalStateManager && stepId) {
        globalStateManager.recordPromptValue(stepId, value);
      }
      resolve(value);
    };

    currentPromptResolve = wrappedResolve;
    currentPromptConfig = config;
    currentPromptType = 'text';

    // Register with replay engine if available
    if (globalReplayEngine) {
      globalReplayEngine.registerPromptResolve(wrappedResolve);
    }
  });
}

// Enhanced confirm function with state tracking
export async function confirm(config: ConfirmFieldConfig & PromptConfig): Promise<boolean> {
  if (!globalFlowManager) {
    throw new Error('confirm() can only be called within an ask() flow');
  }

  return new Promise((resolve) => {
    let stepId: string | undefined;

    // Capture state if back navigation is enabled
    if (globalStateManager) {
      stepId = globalStateManager.capturePromptState('confirm', config);

      // Check for replay value
      if (globalReplayEngine) {
        const replayValue = globalReplayEngine.getReplayValue(config);
        if (replayValue !== undefined) {
          globalStateManager.recordPromptValue(stepId, replayValue);
          resolve(replayValue);
          return;
        }
      }
    }

    const wrappedResolve = (value: boolean) => {
      // Record value in state if tracking is enabled
      if (globalStateManager && stepId) {
        globalStateManager.recordPromptValue(stepId, value);
      }
      resolve(value);
    };

    currentPromptResolve = wrappedResolve;
    currentPromptConfig = config;
    currentPromptType = 'confirm';

    // Register with replay engine if available
    if (globalReplayEngine) {
      globalReplayEngine.registerPromptResolve(wrappedResolve);
    }
  });
}

// Enhanced group function with tracking
export async function group<T>(
  config: GroupConfig & EnhancedGroupConfig,
  fn: () => Promise<T>
): Promise<T> {
  if (!globalFlowManager) {
    throw new Error('group() can only be called within an ask() flow');
  }

  const groupId = config.id || `group_${Date.now()}`;
  let startStepId: string | undefined;
  let endStepId: string | undefined;

  // Capture group start if tracking is enabled
  if (globalStateManager) {
    startStepId = globalStateManager.captureGroupStart(groupId, config);
  }

  try {
    const result = await fn();

    // Capture group end if tracking is enabled
    if (globalStateManager) {
      endStepId = globalStateManager.captureGroupEnd(groupId);
    }

    return result;
  } catch (error) {
    // Capture group end even on error if tracking is enabled
    if (globalStateManager) {
      endStepId = globalStateManager.captureGroupEnd(groupId);
    }
    throw error;
  }
}

// New conditional function for trackable conditionals
export async function conditional(conditionId: string, condition: () => boolean): Promise<boolean> {
  if (!globalStateManager || !globalConditionalManager) {
    // If no state tracking, just evaluate normally
    return condition();
  }

  // Check for cached result first
  const currentVariables = globalStateManager.getAllVariables();
  const cachedResult = globalConditionalManager.getCachedResult(conditionId, currentVariables);

  if (cachedResult !== undefined) {
    return cachedResult;
  }

  // Evaluate condition
  const result = condition();

  // Extract dependencies from current variables
  const dependencies = Object.keys(currentVariables);

  // Record the conditional evaluation
  const stepId = globalStateManager.captureConditional(
    conditionId,
    condition.toString(),
    result,
    dependencies
  );

  globalConditionalManager.recordConditional(
    conditionId,
    condition.toString(),
    result,
    dependencies,
    stepId
  );

  return result;
}

// Functions for PromptApp to interact with current prompt (compatibility)
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

// Enhanced prompt interaction for the enhanced PromptApp
export function getCurrentEnhancedPrompt(): { type: 'text' | 'confirm'; config: any; stepId?: string } | null {
  const currentStep = globalStateManager?.getCurrentStep();
  if (currentStep && currentStep.type === 'prompt') {
    return {
      type: currentStep.promptType as 'text' | 'confirm',
      config: currentStep.config,
      stepId: currentStep.id
    };
  }

  const legacyPrompt = getCurrentPrompt();
  if (legacyPrompt && legacyPrompt.type) {
    return {
      type: legacyPrompt.type,
      config: legacyPrompt.config
    };
  }

  return null;
}

export function resolveEnhancedPrompt(value: any, stepId?: string): void {
  // Record value in state manager if available
  if (globalStateManager && stepId) {
    globalStateManager.recordPromptValue(stepId, value);
  }

  // Also resolve the legacy prompt
  resolveCurrentPrompt(value);
}

export function hasCurrentPrompt(): boolean {
  return currentPromptResolve !== null;
}

// Enhanced back navigation functions
export function canGoBack(): boolean {
  return globalStateManager ? globalStateManager.canGoBack() : false;
}

export function goBack(): boolean {
  if (!globalStateManager) {
    return false;
  }

  const previousStep = globalStateManager.goBack();
  return previousStep !== null;
}

// Get flow state manager (for advanced usage)
export function getFlowStateManager(): FlowStateManager | null {
  return globalStateManager;
}

// Get replay engine (for advanced usage)
export function getReplayEngine(): ReplayEngine | null {
  return globalReplayEngine;
}

// Get conditional manager (for advanced usage)
export function getConditionalManager(): ConditionalManager | null {
  return globalConditionalManager;
}

// Export the original flow manager for compatibility
export function getFlowManager(): FlowManager | null {
  return globalFlowManager;
}