import React from 'react';
import { Box, Text } from 'ink';
import type { GroupConfig } from '../types.js';

export interface GroupSectionProps {
  config: GroupConfig;
  isActive: boolean;
  isCompleted: boolean;
  children: React.ReactNode;
}

export const GroupSection: React.FC<GroupSectionProps> = ({
  config,
  isActive,
  isCompleted,
  children
}) => {
  const getGroupIndicator = () => {
    if (isCompleted) {
      return <Text color="green">✓ </Text>;
    } else if (isActive) {
      return <Text color="blue">▶ </Text>;
    } else {
      return <Text dimColor>  </Text>;
    }
  };

  const getGroupTitle = () => {
    if (isCompleted) {
      return <Text color="green" bold>{config.message}:</Text>;
    } else if (isActive) {
      return <Text color="cyan" bold>{config.message}:</Text>;
    } else {
      return <Text dimColor bold>{config.message}:</Text>;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={0}>
        {getGroupIndicator()}
        {getGroupTitle()}
      </Box>
      <Box flexDirection="column" marginLeft={2}>
        {children}
      </Box>
    </Box>
  );
};