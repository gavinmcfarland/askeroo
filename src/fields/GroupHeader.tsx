import React from 'react';
import { Text, Box } from 'ink';

interface GroupHeaderProps {
  message: string;
}

export function GroupHeader({ message }: GroupHeaderProps) {
  return (
    <Box marginTop={1} marginBottom={1}>
      <Text color="green" bold>
        {message}:
      </Text>
    </Box>
  );
}