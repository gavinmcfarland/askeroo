import React, { useState } from 'react';
import { render, Text, Box, useInput } from 'ink';

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

interface TextPromptProps {
  message: string;
  onSubmit: (value: string | BackToken) => void;
  initial?: string;
}

function TextPrompt({ message, onSubmit, initial = '' }: TextPromptProps) {
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(false);

  useInput((input, key) => {
    if (submitted) return;

    if (key.return) {
      setSubmitted(true);
      onSubmit(value);
    } else if (key.backspace || key.delete) {
      setValue(prev => prev.slice(0, -1));
    } else if (input === '<') {
      setSubmitted(true);
      onSubmit(BACK);
    } else if (!key.ctrl && !key.meta && input) {
      setValue(prev => prev + input);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="cyan">{message}</Text>
      <Text>
        {'> '}
        <Text color="yellow">{value}</Text>
        <Text dimColor> (type '&lt;' to go back)</Text>
      </Text>
    </Box>
  );
}

interface ConfirmPromptProps {
  message: string;
  onSubmit: (value: boolean | BackToken) => void;
  initial?: boolean;
}

function ConfirmPrompt({ message, onSubmit, initial = false }: ConfirmPromptProps) {
  const [value, setValue] = useState<boolean | null>(initial);
  const [submitted, setSubmitted] = useState(false);

  useInput((input, key) => {
    if (submitted) return;

    if (key.return && value !== null) {
      setSubmitted(true);
      onSubmit(value);
    } else if (input === '<') {
      setSubmitted(true);
      onSubmit(BACK);
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
        <Text dimColor> [y/n] (type '&lt;' to go back)</Text>
      </Text>
    </Box>
  );
}

interface GroupHeaderProps {
  message: string;
}

function GroupHeader({ message }: GroupHeaderProps) {
  return (
    <Box marginTop={1} marginBottom={1}>
      <Text color="green" bold>
        {message}:
      </Text>
    </Box>
  );
}

export const ui = {
  text(msg: string, initial?: string): Promise<string | BackToken> {
    return new Promise((resolve) => {
      const { unmount } = render(
        <TextPrompt
          message={msg}
          initial={initial}
          onSubmit={(value) => {
            unmount();
            resolve(value);
          }}
        />
      );
    });
  },

  confirm(msg: string, initial?: boolean): Promise<boolean | BackToken> {
    return new Promise((resolve) => {
      const { unmount } = render(
        <ConfirmPrompt
          message={msg}
          initial={initial}
          onSubmit={(value) => {
            unmount();
            resolve(value);
          }}
        />
      );
    });
  },

  showGroup(label: string): void {
    const { unmount } = render(<GroupHeader message={label} />);
    setTimeout(() => unmount(), 100);
  }
};