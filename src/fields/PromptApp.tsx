import React, { useState, useEffect } from 'react';
import { TextField } from './TextField.js';
import { ConfirmField } from './ConfirmField.js';
import { GroupHeader } from './GroupHeader.js';

type BackToken = { __back: true };

type PromptRequest =
  | { type: 'text'; message: string; initial?: string }
  | { type: 'confirm'; message: string; initial?: boolean }
  | { type: 'group'; message: string };

interface PromptAppProps {
  onReady: (promptFn: (request: PromptRequest) => Promise<any>) => void;
}

export function PromptApp({ onReady }: PromptAppProps) {
  const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(null);
  const [resolvePrompt, setResolvePrompt] = useState<((value: any) => void) | null>(null);

  useEffect(() => {
    const promptFn = (request: PromptRequest): Promise<any> => {
      return new Promise((resolve) => {
        setCurrentPrompt(request);
        setResolvePrompt(() => resolve);
      });
    };

    onReady(promptFn);
  }, [onReady]);

  const handleSubmit = (value: any) => {
    if (resolvePrompt) {
      resolvePrompt(value);
      setCurrentPrompt(null);
      setResolvePrompt(null);
    }
  };

  // Auto-resolve group prompts since they don't need user input
  useEffect(() => {
    if (currentPrompt?.type === 'group' && resolvePrompt) {
      resolvePrompt(undefined);
      setCurrentPrompt(null);
      setResolvePrompt(null);
    }
  }, [currentPrompt, resolvePrompt]);

  if (!currentPrompt) {
    return null;
  }

  switch (currentPrompt.type) {
    case 'text':
      return (
        <TextField
          message={currentPrompt.message}
          initial={currentPrompt.initial}
          onSubmit={handleSubmit}
        />
      );

    case 'confirm':
      return (
        <ConfirmField
          message={currentPrompt.message}
          initial={currentPrompt.initial}
          onSubmit={handleSubmit}
        />
      );

    case 'group':
      return (
        <GroupHeader
          message={currentPrompt.message}
        />
      );

    default:
      return null;
  }
}