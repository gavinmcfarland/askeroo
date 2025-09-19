import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';

type BackToken = { __back: true };

interface ConfirmFieldProps {
  message: string;
  onSubmit: (value: boolean | BackToken) => void;
  initial?: boolean;
}

export function ConfirmField({ message, onSubmit, initial = false }: ConfirmFieldProps) {
  const [value, setValue] = useState<boolean | null>(initial);
  const [submitted, setSubmitted] = useState(false);

  useInput((input, key) => {
    if (submitted) return;

    if (key.return && value !== null) {
      setSubmitted(true);
      onSubmit(value);
    } else if (key.escape) {
      onSubmit({ __back: true });
    } else if (input.toLowerCase() === 'y') {
      setValue(true);
    } else if (input.toLowerCase() === 'n') {
      setValue(false);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">{message}</Text>
      <Text>
        {'> '}
        <Text color="yellow">
          {value === null ? '' : value ? 'yes' : 'no'}
        </Text>
        <Text dimColor> [y/n] (press Esc to go back)</Text>
      </Text>
    </Box>
  );
}