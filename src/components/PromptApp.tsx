import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { FlowManager } from '../flow-manager.js';
import { TextField } from '../fields/TextField.js';
import { ConfirmField } from '../fields/ConfirmField.js';
import { GroupSection } from './GroupSection.js';
import { getCurrentPrompt, resolveCurrentPrompt, hasCurrentPrompt } from '../core.js';

export interface PromptAppProps {
  flowManager: FlowManager;
  flowFunction: () => Promise<any>;
  onComplete: (result: any) => void;
  onError: (error: Error) => void;
  onExit: () => void;
}

interface PromptState {
  type: 'text' | 'confirm';
  config: any;
  key: string;
  isActive: boolean;
  groupKey: string;
}

interface GroupState {
  key: string;
  config: any;
  isActive: boolean;
  isCompleted: boolean;
  fields: PromptState[];
}

export const PromptApp: React.FC<PromptAppProps> = ({ flowManager, flowFunction, onComplete, onError, onExit }) => {
  const [currentPrompt, setCurrentPrompt] = useState<{ type: 'text' | 'confirm'; config: any } | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [flowStarted, setFlowStarted] = useState(false);

  // Start the flow execution
  useEffect(() => {
    if (!flowStarted) {
      setFlowStarted(true);

      // Start executing the flow function asynchronously
      flowFunction()
        .then((result) => {
          setIsComplete(true);
          onComplete(result);
        })
        .catch((error) => {
          onError(error);
        });
    }
  }, [flowStarted, flowFunction, onComplete, onError]);

  // Check for current prompt periodically
  useEffect(() => {
    const checkForPrompt = () => {
      const prompt = getCurrentPrompt();
      if (prompt && prompt.type && !currentPrompt) {
        setCurrentPrompt(prompt as { type: 'text' | 'confirm'; config: any });
      } else if (!prompt && currentPrompt) {
        setCurrentPrompt(null);
      }
    };

    const interval = setInterval(checkForPrompt, 50); // Check every 50ms
    return () => clearInterval(interval);
  }, [currentPrompt]);

  // Handle graceful exit
  const handleExit = useCallback(() => {
    // Clean up stdin
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();

    // Call the exit handler
    onExit();
  }, [onExit]);

  const handleFieldSubmit = useCallback((value: any) => {
    if (!currentPrompt) {
      return;
    }

    // Resolve the current prompt with the submitted value
    resolveCurrentPrompt(value);

    // Clear the current prompt state
    setCurrentPrompt(null);
  }, [currentPrompt]);

  const handleBack = useCallback(() => {
    // For now, back navigation is not implemented in dynamic mode
    // TODO: Implement back navigation with flow state management
    console.log('Back navigation not yet implemented in dynamic mode');
  }, []);

  if (isComplete) {
    return (
      <Box flexDirection="column">
        <Text color="green">✓ Flow completed!</Text>
      </Box>
    );
  }

  // Render based on current prompt
  if (!currentPrompt) {
    return (
      <Box flexDirection="column">
        <Text dimColor>Waiting for next prompt...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
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

      <Box marginTop={1}>
        <Text dimColor>(Use Esc to go back, Enter to continue, Ctrl+C to exit)</Text>
      </Box>
    </Box>
  );
};