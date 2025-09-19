import React, { useState, useEffect, useRef } from 'react';
import { TextField } from './TextField.js';
import { ConfirmField } from './ConfirmField.js';
import { GroupContainer } from './GroupContainer.js';

type BackToken = { __back: true };

type PromptRequest =
  | { type: 'text'; message: string; initial?: string; groupName?: string; fieldId?: string }
  | { type: 'confirm'; message: string; initial?: boolean; groupName?: string; fieldId?: string }
  | { type: 'group'; message: string; fieldId?: string };

interface PromptAppProps {
  onReady: (promptFn: (request: PromptRequest) => Promise<any>) => void;
}

export function PromptApp({ onReady }: PromptAppProps) {
  const [currentPrompt, setCurrentPrompt] = useState<PromptRequest | null>(null);
  const [resolvePrompt, setResolvePrompt] = useState<((value: any) => void) | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [visitedPrompts, setVisitedPrompts] = useState<Set<string>>(new Set());
  const [currentGroup, setCurrentGroup] = useState<string | null>(null);
  const firstFieldIdRef = useRef<string | null>(null);
  const interactiveFieldCountRef = useRef<number>(0);

  useEffect(() => {
    const promptFn = (request: PromptRequest): Promise<any> => {
      return new Promise((resolve) => {
        // Create a unique ID for this field request
        let fieldId: string | undefined;
        if (request.type !== 'group') {
          fieldId = `${request.type}:${request.message}:${interactiveFieldCountRef.current}`;

          // Track the first interactive field (only set once per app lifecycle)
          if (firstFieldIdRef.current === null) {
            firstFieldIdRef.current = fieldId;
          }

          interactiveFieldCountRef.current++;
        }

        setCurrentPrompt({...request, fieldId});
        setResolvePrompt(() => resolve);

        // Update current group state
        if (request.type === 'group') {
          setCurrentGroup(request.message);
        } else if (request.groupName) {
          setCurrentGroup(request.groupName);
        } else {
          setCurrentGroup(null);
        }
      });
    };

    onReady(promptFn);
  }, [onReady]);

  const isBackToken = (value: any): value is BackToken => {
    return typeof value === "object" && value !== null && value.__back === true;
  };

  const handleSubmit = (value: any) => {
    if (resolvePrompt && currentPrompt) {
      // Only store actual values, not back tokens
      if (currentPrompt.type !== 'group' && !isBackToken(value)) {
        setFieldValues(prev => ({
          ...prev,
          [currentPrompt.message]: value
        }));
        // Mark this prompt as visited when we store a value
        setVisitedPrompts(prev => new Set(prev).add(currentPrompt.message));
      }

      // If going back, clean up visited prompts that are no longer reachable
      // Only update visited prompts if this prompt was actually visited before
      if (isBackToken(value) && visitedPrompts.has(currentPrompt.message)) {
        setVisitedPrompts(prev => {
          const newVisited = new Set(prev);
          newVisited.delete(currentPrompt.message);
          return newVisited;
        });
      }

      resolvePrompt(value);
      setResolvePrompt(null);
      // Don't clear currentPrompt for back navigation within groups
      // Let the next prompt replace it to avoid flickering
    }
  };

  // Auto-resolve group prompts since they don't need user input
  useEffect(() => {
    if (currentPrompt?.type === 'group' && resolvePrompt) {
      resolvePrompt(undefined);
      setResolvePrompt(null);
      // Don't clear currentPrompt immediately - let the next prompt replace it
    }
  }, [currentPrompt, resolvePrompt]);

  if (!currentPrompt) {
    return null;
  }

  const renderField = () => {
    if (!currentPrompt) return null;

    let field: React.ReactNode;

    switch (currentPrompt.type) {
      case 'text':
        const textAllowBack = currentPrompt.fieldId !== firstFieldIdRef.current;
        field = (
          <TextField
            key={currentPrompt.fieldId}
            message={currentPrompt.message}
            initial={visitedPrompts.has(currentPrompt.message) ? fieldValues[currentPrompt.message] ?? currentPrompt.initial : currentPrompt.initial}
            allowBack={textAllowBack}
            onSubmit={handleSubmit}
          />
        );
        break;

      case 'confirm':
        const confirmAllowBack = currentPrompt.fieldId !== firstFieldIdRef.current;
        field = (
          <ConfirmField
            key={currentPrompt.fieldId}
            message={currentPrompt.message}
            initial={visitedPrompts.has(currentPrompt.message) ? fieldValues[currentPrompt.message] ?? currentPrompt.initial : currentPrompt.initial}
            allowBack={confirmAllowBack}
            onSubmit={handleSubmit}
          />
        );
        break;

      case 'group':
        // Group headers are now handled by GroupContainer wrapping fields
        // Render a placeholder that will be wrapped by GroupContainer
        field = <React.Fragment key={currentPrompt.message} />;
        break;

      default:
        return null;
    }

    // Wrap field in GroupContainer if we're in a group
    if (currentGroup && field) {
      return (
        <GroupContainer key={`group-${currentGroup}`} groupName={currentGroup}>
          {field}
        </GroupContainer>
      );
    }

    return field;
  };

  return renderField();
}