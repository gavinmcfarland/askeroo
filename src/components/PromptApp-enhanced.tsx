import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { FlowManager } from '../flow-manager.js';
import { TextField } from '../fields/TextField.js';
import { ConfirmField } from '../fields/ConfirmField.js';
import { GroupSection } from './GroupSection.js';
import { getCurrentPrompt, resolveCurrentPrompt, hasCurrentPrompt, getCurrentEnhancedPrompt, resolveEnhancedPrompt } from '../core-enhanced.js';
import { FlowStateManager } from '../flow-state/FlowStateManager.js';
import { ReplayEngine } from '../flow-state/ReplayEngine.js';

export interface EnhancedPromptAppProps {
  flowManager: FlowManager;
  flowFunction: () => Promise<any>;
  onComplete: (result: any) => void;
  onError: (error: Error) => void;
  onExit: () => void;
  enableBackNavigation?: boolean;
  stateManager?: FlowStateManager | null;
  replayEngine?: ReplayEngine | null;
  debugMode?: boolean;
}

interface PromptState {
  type: 'text' | 'confirm';
  config: any;
  stepId?: string;
  isActive: boolean;
}

interface FlowState {
  steps: any[];
  currentIndex: number;
  promptSteps: any[];
  currentPromptIndex: number;
  totalPrompts: number;
  variables: Record<string, any>;
  canGoBack: boolean;
  currentStep: any;
}

export const EnhancedPromptApp: React.FC<EnhancedPromptAppProps> = ({
  flowManager,
  flowFunction,
  onComplete,
  onError,
  onExit,
  enableBackNavigation = false,
  stateManager,
  replayEngine,
  debugMode = false
}) => {
  const [currentPrompt, setCurrentPrompt] = useState<PromptState | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);
  const [flowState, setFlowState] = useState<FlowState | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [backNavigationRequested, setBackNavigationRequested] = useState(false);

  // Subscribe to state manager changes
  useEffect(() => {
    if (!stateManager) return;

    const unsubscribe = stateManager.subscribe((state: FlowState) => {
      setFlowState(state);
    });

    return unsubscribe;
  }, [stateManager]);

  // Start the flow execution
  useEffect(() => {
    if (!flowStarted) {
      setFlowStarted(true);
      executeFlow();
    }
  }, [flowStarted]);

  const executeFlow = useCallback(async () => {
    try {
      let result: any;

      if (replayEngine && backNavigationRequested) {
        // Execute with replay from current state
        setIsReplaying(true);
        const currentStep = stateManager?.getCurrentStep();
        result = await replayEngine.executeFlow(flowFunction, currentStep?.id);
        setIsReplaying(false);
        setBackNavigationRequested(false);
      } else {
        // Normal execution
        result = await flowFunction();
      }

      setIsComplete(true);
      onComplete(result);
    } catch (error) {
      setIsReplaying(false);
      setBackNavigationRequested(false);
      onError(error as Error);
    }
  }, [flowFunction, onComplete, onError, replayEngine, stateManager, backNavigationRequested]);

  // Check for current prompt periodically
  useEffect(() => {
    const checkForPrompt = () => {
      const prompt = enableBackNavigation ? getCurrentEnhancedPrompt() : getCurrentPrompt();
      if (prompt && prompt.type && !currentPrompt) {
        setCurrentPrompt({
          type: prompt.type,
          config: prompt.config,
          stepId: (prompt as any).stepId,
          isActive: true
        });
      } else if (!prompt && currentPrompt) {
        setCurrentPrompt(null);
      }
    };

    const interval = setInterval(checkForPrompt, 50);
    return () => clearInterval(interval);
  }, [currentPrompt, enableBackNavigation]);

  // Handle graceful exit
  const handleExit = useCallback(() => {
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    onExit();
  }, [onExit]);

  const handleFieldSubmit = useCallback((value: any) => {
    if (!currentPrompt) {
      return;
    }

    if (enableBackNavigation && currentPrompt.stepId) {
      resolveEnhancedPrompt(value, currentPrompt.stepId);
    } else {
      resolveCurrentPrompt(value);
    }

    setCurrentPrompt(null);
  }, [currentPrompt, enableBackNavigation]);

  const handleBack = useCallback(() => {
    if (!enableBackNavigation || !stateManager) {
      console.log('\n⚠️  Back navigation is not enabled.');
      console.log('💡 Use Ctrl+C to exit and restart if you need to change previous answers.');
      return;
    }

    if (!stateManager.canGoBack()) {
      console.log('\n⚠️  Cannot go back - no previous prompts.');
      return;
    }

    // Go back to previous step
    const previousStep = stateManager.goBack();
    if (previousStep) {
      console.log(`\n🔄 Going back to: ${previousStep.config?.message || 'previous prompt'}`);

      // Clear current prompt to force re-render
      setCurrentPrompt(null);

      // Set the current prompt to the previous step immediately
      setCurrentPrompt({
        type: previousStep.promptType as 'text' | 'confirm',
        config: previousStep.config,
        stepId: previousStep.id,
        isActive: true
      });
    }
  }, [enableBackNavigation, stateManager]);

  // Render completion state
  if (isComplete) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Flow completed!</Text>
        {debugMode && flowState && (
          <Box marginTop={1}>
            <Text dimColor>Debug: {flowState.steps.length} steps executed</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render waiting state
  if (!currentPrompt) {
    return (
      <Box flexDirection="column">
        <Text dimColor>
          {isReplaying ? 'Replaying flow...' : 'Waiting for next prompt...'}
        </Text>
        {debugMode && flowState && (
          <Box marginTop={1}>
            <Text dimColor>
              Debug: Prompt {Math.max(1, flowState.currentPromptIndex + 1)} of {Math.max(1, flowState.totalPrompts)}
              {flowState.canGoBack && ' (can go back)'}
            </Text>
          </Box>
        )}
      </Box>
    );
  }

  // Render current prompt
  return (
    <Box flexDirection="column">
      {/* Debug information */}
      {debugMode && flowState && (
        <Box marginBottom={1}>
          <Text dimColor>
            Debug: Prompt {flowState.currentPromptIndex + 1}/{flowState.totalPrompts}
            {' | Variables: '}
            {Object.keys(flowState.variables).join(', ') || 'none'}
          </Text>
        </Box>
      )}

      {/* Current prompt */}
      {currentPrompt.type === 'text' && (
        <TextField
          config={currentPrompt.config}
          onSubmit={handleFieldSubmit}
          onBack={handleBack}
          onExit={handleExit}
          isActive={true}
        />
      )}

      {currentPrompt.type === 'confirm' && (
        <ConfirmField
          config={currentPrompt.config}
          onSubmit={handleFieldSubmit}
          onBack={handleBack}
          onExit={handleExit}
          isActive={true}
        />
      )}

      {/* Enhanced instructions */}
      <Box marginTop={1}>
        <Text dimColor>
          (Use{' '}
          {enableBackNavigation && flowState?.canGoBack
            ? 'Esc to go back, '
            : 'Esc for options, '
          }
          Enter to continue, Ctrl+C to exit)
        </Text>
      </Box>

      {/* Back navigation status */}
      {enableBackNavigation && flowState && (
        <Box marginTop={1}>
          <Text dimColor>
            {flowState.canGoBack
              ? `📍 Prompt ${flowState.currentPromptIndex + 1} - Press Esc to go back`
              : '📍 First prompt - cannot go back'
            }
          </Text>
        </Box>
      )}

      {/* Replay indicator */}
      {isReplaying && (
        <Box marginTop={1}>
          <Text color="yellow">🔄 Replaying from previous step...</Text>
        </Box>
      )}
    </Box>
  );
};