import React from 'react';
import { Box, Text } from 'ink';
import type { GroupConfig } from '../types.js';

export interface GroupPromptProps {
  config: GroupConfig;
  isActive: boolean;
  isCompleted: boolean;
}

export const GroupPrompt: React.FC<GroupPromptProps> = ({ config, isActive, isCompleted }) => {
  if (isCompleted) {
    return (
      <Box marginBottom={1}>
        <Text color="green">✓ </Text>
        <Text bold color="white">{config.message}</Text>
      </Box>
    );
  }

  if (isActive) {
    return (
      <Box marginBottom={1}>
        <Text color="blue">▶ </Text>
        <Text bold color="cyan">{config.message}</Text>
      </Box>
    );
  }

  return (
    <Box marginBottom={1}>
      <Text dimColor>  </Text>
      <Text dimColor bold>{config.message}</Text>
    </Box>
  );
};