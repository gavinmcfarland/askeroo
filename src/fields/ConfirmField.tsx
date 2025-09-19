import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import type { ConfirmFieldConfig } from '../types.js';

export interface ConfirmFieldProps {
  config: ConfirmFieldConfig;
  onSubmit: (value: boolean) => void;
  onBack: () => void;
  onExit: () => void;
  isActive: boolean;
}

export const ConfirmField: React.FC<ConfirmFieldProps> = ({ config, onSubmit, onBack, onExit, isActive }) => {
  const [value, setValue] = useState(config.initial ?? false);
  const [submitted, setSubmitted] = useState(false);

  // Reset field state when becoming active again (e.g., after going back)
  useEffect(() => {
    if (isActive && submitted) {
      setValue(config.initial ?? false);
      setSubmitted(false);
    }
  }, [isActive, submitted, config.initial]);

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

      // Handle arrow keys for toggling
      if (input === '\u001b[D' || input === '\u001b[C') { // Left/Right arrows
        setValue(prev => !prev);
        return;
      }

      // Ignore other escape sequences
      if (input.startsWith('\u001b[')) {
        return;
      }

      // Handle enter key for submission
      if (input === '\r' || input === '\n') {
        setSubmitted(true);
        onSubmit(value);
        return;
      }

      // Handle y/n keys (case insensitive)
      const lowerInput = input.toLowerCase();
      if (lowerInput === 'y') {
        setValue(true);
      } else if (lowerInput === 'n') {
        setValue(false);
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
  }, [isActive, value, onSubmit, onBack, onExit]);

  if (submitted) {
    return (
      <Box>
        <Text color="green">✓ </Text>
        <Text>{config.message}: </Text>
        <Text color="cyan">{value ? 'Yes' : 'No'}</Text>
      </Box>
    );
  }

  if (!isActive) {
    return (
      <Box>
        <Text dimColor>  {config.message}: </Text>
        <Text dimColor>{value ? 'Yes' : 'No'}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text color="blue">? </Text>
      <Text>{config.message}: </Text>
      <Box marginLeft={1}>
        <Text color={value ? 'cyan' : 'gray'}>{value ? '● Yes' : '○ Yes'}</Text>
        <Text> / </Text>
        <Text color={!value ? 'cyan' : 'gray'}>{!value ? '● No' : '○ No'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>(Use arrow keys, y/n, or enter to confirm)</Text>
      </Box>
    </Box>
  );
};