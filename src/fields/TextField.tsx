import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { TextFieldConfig } from '../types.js';

export interface TextFieldProps {
  config: TextFieldConfig;
  onSubmit: (value: string) => void;
  onBack: () => void;
  onExit: () => void;
  isActive: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({ config, onSubmit, onBack, onExit, isActive }) => {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset field state when becoming active again (e.g., after going back)
  useEffect(() => {
    if (isActive && submitted) {
      setValue('');
      setSubmitted(false);
      setValidationError(null);
    }
  }, [isActive, submitted]);

  useEffect(() => {
    if (!isActive) return;

    const handleData = (data: Buffer) => {
      const input = data.toString();

      // Handle Ctrl+C for exit
      if (input === '\u0003') {
        onExit();
        return;
      }

      // Handle escape key for going back (check for standalone escape)
      if (input === '\u001b' || input === '\u001b\u001b') {
        onBack();
        return;
      }

      // Ignore escape sequences (arrow keys, etc.)
      if (input.startsWith('\u001b[')) {
        return;
      }

      // Handle enter key for submission
      if (input === '\r' || input === '\n') {
        if (config.validate) {
          const validation = config.validate(value);
          if (validation !== true) {
            // Set validation error message
            setValidationError(typeof validation === 'string' ? validation : 'Invalid input');
            return;
          }
        }
        // Clear any previous validation error
        setValidationError(null);
        setSubmitted(true);
        onSubmit(value);
        return;
      }

      // Handle backspace
      if (input === '\u007f' || input === '\b') {
        setValue(prev => prev.slice(0, -1));
        // Clear validation error when user modifies input
        if (validationError) {
          setValidationError(null);
        }
        return;
      }

      // Handle regular characters
      if (input.length === 1 && input.charCodeAt(0) >= 32 && input.charCodeAt(0) <= 126) {
        setValue(prev => prev + input);
        // Clear validation error when user starts typing
        if (validationError) {
          setValidationError(null);
        }
      }
    };

    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.on('data', handleData);

    return () => {
      process.stdin.off('data', handleData);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
    };
  }, [isActive, value, config, onSubmit, onBack, onExit, validationError]);

  if (submitted) {
    return (
      <Box>
        <Text color="green">✓ </Text>
        <Text>{config.message}: </Text>
        <Text color="cyan">{value}</Text>
      </Box>
    );
  }

  if (!isActive) {
    return (
      <Box>
        <Text dimColor>  {config.message}: </Text>
        <Text dimColor>{value || (config.placeholder ? `(${config.placeholder})` : '')}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="blue">? </Text>
        <Text>{config.message}: </Text>
        <Text color="cyan">{value}</Text>
        <Text color="gray">|</Text>
        {config.placeholder && value === '' && (
          <Text dimColor> ({config.placeholder})</Text>
        )}
      </Box>
      {validationError && (
        <Box marginLeft={2}>
          <Text color="red">✗ {validationError}</Text>
        </Box>
      )}
    </Box>
  );
};