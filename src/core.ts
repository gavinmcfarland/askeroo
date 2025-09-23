import { debugLogger } from './debug.js';
import { globalRegistry, setCurrentRuntime } from './registry.js';

export type Answers = Record<string, unknown>;

type PromptKind = "text" | "confirm" | "group" | string;
type PromptOpts = { message: string; id?: string };
type GroupOpts = {
  message?: string;
  id?: string;
  flow?: 'phase' | 'static';
  discovery?: {
    mode?: 'upfront' | 'reactive' | 'hybrid';
    triggers?: string[];
    debounceMs?: number;
  };
};

type UI = {
  text(msg: string, initial?: string, groupContext?: string, id?: string): Promise<string | BackToken>;
  confirm(msg: string, initial?: boolean, groupContext?: string, id?: string): Promise<boolean | BackToken>;
  showGroup(label: string | undefined, flow?: 'phase' | 'static', id?: string, discoveredFields?: Array<{id: string, message: string, type: string}>): Promise<void> | void;
  clearGroup?(): void;
  cleanup?(): void;
  // Dynamic UI handlers from plugins
  [key: string]: any;
};

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

type Engine = {
  step<T>(kind: PromptKind, opts: PromptOpts | GroupOpts, askFn: (id: string) => Promise<T | BackToken>): Promise<T>;
  BACK: BackToken;
};

// Generate stable, deterministic ID based on content, not execution order
function generateStableId(kind: PromptKind, message: string, groupStack: string[], stepIndex: number): string {
  const parts: string[] = [kind];

  // Add group context if we're in a group
  if (groupStack.length > 0) {
    const currentGroup = groupStack[groupStack.length - 1];
    parts.push(`group:${currentGroup}`);
  }

  // Use message hash as primary identifier instead of step index
  // This ensures the same field gets the same ID regardless of discovery vs execution order
  const messageHash = simpleHash(message);
  parts.push(`msg:${messageHash}`);

  // Add step index only as a fallback for fields with identical messages
  // This maintains uniqueness while prioritizing content-based stability
  if (message) {
    // For fields with messages, the message hash should be sufficient
    // Don't include step index to avoid discovery/execution order dependencies
  } else {
    // Only for fields without messages, fall back to step index
    parts.push(`step:${stepIndex}`);
  }

  return parts.join('|');
}

// Generate stable group identifier for tracking
function getGroupIdentifier(opts: GroupOpts, groupStack: string[], executionContext: { groupCount: number }): string {
  // Use explicit id if provided
  if (opts.id) return opts.id;

  // Use message if provided
  if (opts.message) return opts.message;

  // Generate stable ID based on execution context
  const depth = groupStack.length;
  const groupIndex = executionContext.groupCount;
  const flowType = opts.flow || 'sequential';

  return `group_${depth}_${groupIndex}_${flowType}`;
}

// Simple hash function for generating short, stable hashes
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

export function createRuntime(ui: UI) {
  debugLogger.log('RUNTIME_CREATE', { ui: typeof ui });

  // Extend UI with plugin handlers
  const pluginHandlers = globalRegistry.getUIHandlers();
  const extendedUI = { ...ui, ...pluginHandlers };

  const answers: Answers = {};
  let interactivePrompts: string[] = [];
  let currentStep = 0;
  let asking = false;
  let isReplaying: boolean | "smart" = false; // Track replay mode: false, true, or "smart"
  let targetGroup: string | undefined; // For smart replay mode

  // Track execution context to avoid unnecessary replays
  let executionPath: Array<{
    id: string;
    kind: PromptKind;
    groupContext?: string;
    stepIndex: number;
  }> = [];

  let groupStack: string[] = []; // Track current group nesting
  let lastProcessedGroups: Set<string> = new Set(); // Track which groups were already processed
  let phaseGroups: Map<string, 'phase'> = new Map(); // Track groups with phase flow
  let staticGroups: Map<string, 'static'> = new Map(); // Track groups with static flow
  let groupCount = 0; // Track total number of groups encountered for stable ID generation
  let isDiscoveryMode = false; // Track if we're in discovery mode for static groups
  let discoveredFields: Map<string, Array<{id: string, message: string, type: string}>> = new Map(); // Track discovered fields for static groups
  let staticGroupBodies: Map<string, () => Promise<any>> = new Map(); // Store group body functions for re-discovery


  const engine: Engine = {
    BACK,
    async step<T>(kind: PromptKind, opts: PromptOpts | GroupOpts, askFn: (id: string) => Promise<T | BackToken>) {
      debugLogger.log('ENGINE_STEP', { kind, opts, currentStep, groupStack: [...groupStack], isReplaying });

      if (kind === "group") {
        const groupOpts = opts as GroupOpts;

        // Increment group count for stable ID generation
        groupCount++;

        const groupId = getGroupIdentifier(groupOpts, groupStack, { groupCount });
        let shouldShowGroup: boolean;

        // Track phase groups (non-default behavior)
        if (groupOpts.flow === 'phase') {
          phaseGroups.set(groupId, 'phase');
        }

        // Track static groups (non-default behavior)
        if (groupOpts.flow === 'static') {
          staticGroups.set(groupId, 'static');
        }

        if (isReplaying === "smart") {
          // Smart replay: show the target group and any groups that come after it
          const isTargetOrAfter = groupId === targetGroup ||
                                 (!!targetGroup && lastProcessedGroups.has(targetGroup));
          shouldShowGroup = isTargetOrAfter && !lastProcessedGroups.has(groupId);
        } else {
          // Normal logic: show if not replaying and not already processed
          shouldShowGroup = !isReplaying && (!lastProcessedGroups.has(groupId) || currentStep >= interactivePrompts.length);
        }

        // Only call askFn (which creates UI prompts) if we should show the group
        if (shouldShowGroup) {
          debugLogger.log('GROUP_SHOW', { groupId, groupMessage: groupOpts.message, flow: groupOpts.flow, shouldShowGroup });
          const fields = groupOpts.flow === 'static' ? discoveredFields.get(groupId) : undefined;
          await extendedUI.showGroup?.(groupOpts.message, groupOpts.flow, groupId, fields);
          lastProcessedGroups.add(groupId);
          // Call askFn to create the interactive prompt
          await askFn(generateStableId("group", groupId, groupStack, 0));
        } else {
          debugLogger.log('GROUP_SKIP', { groupId, groupMessage: groupOpts.message, shouldShowGroup, isReplaying });
        }

        groupStack.push(groupId);
        return undefined as T;
      }

      // This is an interactive prompt
      const stepIndex = interactivePrompts.length;

      // Generate stable, deterministic ID
      // In discovery mode, use a placeholder step index to ensure consistent IDs
      const effectiveStepIndex = isDiscoveryMode ? 0 : stepIndex;
      const id = opts.id ?? generateStableId(kind, opts.message || `${kind}-${effectiveStepIndex}`, groupStack, effectiveStepIndex);

      // In discovery mode, just track the field and return current value or placeholder
      if (isDiscoveryMode) {
        const currentGroupId = groupStack[groupStack.length - 1];
        debugLogger.log('DISCOVERY_FIELD', { currentGroupId, id, message: opts.message, kind });
        if (currentGroupId) {
          const fields = discoveredFields.get(currentGroupId) || [];
          if (!fields.some(f => f.id === id)) {
            fields.push({
              id,
              message: opts.message || `${kind} field`,
              type: kind
            });
            discoveredFields.set(currentGroupId, fields);
            debugLogger.log('DISCOVERY_FIELD_ADDED', { currentGroupId, fieldCount: fields.length });
          } else {
            debugLogger.log('DISCOVERY_FIELD_SKIP', { message: opts.message });
          }
        }

        // Use current field value if available, otherwise use smart placeholder
        if (id in answers) {
          const currentValue = answers[id];
          debugLogger.log('DISCOVERY_CURRENT_VALUE', { id, currentValue });
          return currentValue as T;
        }

        // Use current field values during discovery to enable staged discovery
        // This allows conditional fields to be revealed as conditions are met
        let placeholderValue: any;
        if (kind === 'confirm') {
          // Use existing boolean value if available, otherwise default to false
          placeholderValue = (id in answers) ? answers[id] : false;
        } else {
          // For text fields, use existing field values if available
          // This is key for staged discovery - when a field value changes,
          // re-running discovery with that value will reveal conditional fields
          if (id in answers) {
            placeholderValue = answers[id];
          } else {
            // Use empty string as default for initial discovery
            placeholderValue = '';
          }
        }

        debugLogger.log('DISCOVERY_PLACEHOLDER', { kind, message: opts.message, placeholderValue });
        return placeholderValue as T;
      }

      interactivePrompts.push(id);

      // Track execution path for smart replay
      executionPath.push({
        id,
        kind,
        groupContext: groupStack[groupStack.length - 1],
        stepIndex
      });


      // If we already have an answer and we're replaying past this step, use it
      if (stepIndex < currentStep && id in answers) {
        debugLogger.log('PROMPT_REPLAY', { id, stepIndex, currentStep, answer: answers[id] });
        return answers[id] as T;
      }

      // If this is the current step to ask, prompt the user
      if (stepIndex === currentStep) {
        debugLogger.log('PROMPT_ASK', { id, stepIndex, message: opts.message });
        const result = await askFn(id);
        if (isBack(result)) {
          debugLogger.log('PROMPT_BACK', { id, stepIndex });
          throw BACK;
        }
        debugLogger.log('PROMPT_ANSWER', { id, stepIndex, result });
        answers[id] = result;
        currentStep += 1;
        return result as T;
      }

      // If we have an answer for this step, use it
      if (id in answers) {
        debugLogger.log('PROMPT_CACHED', { id, stepIndex, answer: answers[id] });
        return answers[id] as T;
      }

      // This shouldn't happen in normal flow, but handle it defensively
      const result = await askFn(id);
      if (isBack(result)) throw BACK;
      answers[id] = result;
      currentStep = stepIndex + 1;
      return result as T;
    },
  };

  function isBack<T>(x: T | BackToken): x is BackToken {
    return typeof x === "object" && x !== null && (x as any).__back === true;
  }

  async function runStaticGroupDiscovery(opts: GroupOpts, body: () => Promise<any>) {
    // Pre-generate the group ID that engine.step will use
    const nextGroupCount = groupCount + 1;
    const discoveryGroupId = getGroupIdentifier(opts, groupStack, { groupCount: nextGroupCount });

    debugLogger.log('DISCOVERY_START', { groupId: discoveryGroupId, answersCount: Object.keys(answers).length });

    isDiscoveryMode = true;
    debugLogger.log('DISCOVERY_START', { groupId: discoveryGroupId, groupStack: [...groupStack] });

    // Push group to stack temporarily for discovery
    groupStack.push(discoveryGroupId);

    try {
      // Run initial discovery with default values
      debugLogger.log('DISCOVERY_PASS', { pass: 1, type: 'default' });
      await body();

      // Run additional discovery passes with different placeholder values
      // to explore conditional branches
      const currentFields = discoveredFields.get(discoveryGroupId) || [];
      debugLogger.log('DISCOVERY_PASS_COMPLETE', { pass: 1, fieldsFound: currentFields.length });

      // Find text fields that might be condition fields (for exploring branches)
      const textFields = currentFields.filter(f => f.type === 'text');

      for (const textField of textFields) {
        debugLogger.log('DISCOVERY_CONDITIONAL_PASS', { field: textField.message });

        // Try common conditional values to explore different branches
        const testValues = ['admin', 'user', 'premium', 'basic', 'yes', 'no', 'true', 'false'];

        for (const testValue of testValues) {
          const fieldsBefore = discoveredFields.get(discoveryGroupId)?.length || 0;

          // Set a test value for this field to explore conditional branches
          answers[textField.id] = testValue;
          debugLogger.log('DISCOVERY_TEST_VALUE', { field: textField.message, value: testValue });

          try {
            await body(); // Run discovery with this test value
          } catch (e) {
            // Ignore errors during exploration
            debugLogger.log('DISCOVERY_TEST_ERROR', { field: textField.message, value: testValue, error: e });
          }

          const fieldsAfter = discoveredFields.get(discoveryGroupId)?.length || 0;
          if (fieldsAfter > fieldsBefore) {
            debugLogger.log('DISCOVERY_NEW_FIELDS', {
              field: textField.message,
              value: testValue,
              newFields: fieldsAfter - fieldsBefore
            });
          }

          // Clean up the test value
          delete answers[textField.id];
        }
      }
    } catch (e) {
      debugLogger.log('DISCOVERY_ERROR', { groupId: discoveryGroupId, error: e });
      // Ignore errors in discovery mode
    } finally {
      // Remove from stack after discovery
      groupStack.pop();
    }

    isDiscoveryMode = false;
    const discoveredFieldsForGroup = discoveredFields.get(discoveryGroupId);
    debugLogger.log('DISCOVERY_END', { groupId: discoveryGroupId, fieldCount: discoveredFieldsForGroup?.length || 0, fields: discoveredFieldsForGroup });
  }

  async function group(opts: GroupOpts, body: () => Promise<any>) {
    if (!asking) throw new Error("group() must be called inside ask()");

    // For static groups, we need to run discovery to find fields
    if (opts.flow === 'static') {
      const nextGroupCount = groupCount + 1;
      const groupId = getGroupIdentifier(opts, groupStack, { groupCount: nextGroupCount });

      // Store the body function for re-discovery
      staticGroupBodies.set(groupId, body);

      await runStaticGroupDiscovery(opts, body);
    }

    await engine.step("group", opts, async () => undefined);

    try {
      return await body();
    } finally {
      // Pop the group from the stack when the group body completes
      groupStack.pop();
      extendedUI.clearGroup?.();
    }
  }

  async function text(opts: PromptOpts): Promise<string> {
    if (!asking) throw new Error("text() must be called inside ask()");
    return engine.step("text", opts, (id) => {
      const currentGroup = groupStack[groupStack.length - 1];
      return extendedUI.text(opts.message, undefined, currentGroup, id);
    });
  }

  async function confirm(opts: PromptOpts): Promise<boolean> {
    if (!asking) throw new Error("confirm() must be called inside ask()");
    return engine.step("confirm", opts, (id) => {
      const currentGroup = groupStack[groupStack.length - 1];
      return extendedUI.confirm(opts.message, undefined, currentGroup, id);
    });
  }

  async function ask<T>(flow: (api: { group: typeof group; text: typeof text; confirm: typeof confirm; BACK: BackToken }) => Promise<T>): Promise<T> {
    debugLogger.log('ASK_START', { currentStep, answersCount: Object.keys(answers).length });

    while (true) {
      // Check what kind of navigation optimization we can use
      const targetStepGroup = executionPath[currentStep]?.groupContext;
      const sourceStepGroup = executionPath[currentStep + 1]?.groupContext;

      const isSameGroupNav = currentStep >= 0 &&
        targetStepGroup &&
        sourceStepGroup &&
        targetStepGroup === sourceStepGroup;

      const isCrossGroupNav = currentStep >= 0 &&
        targetStepGroup &&
        sourceStepGroup &&
        targetStepGroup !== sourceStepGroup;

      const canOptimize = isSameGroupNav || isCrossGroupNav;


      // Choose navigation strategy
      if (!canOptimize) {
        isReplaying = false;
        // Full replay - reset all tracking
        interactivePrompts = [];
        executionPath = [];
        groupStack = [];
        groupCount = 0; // Reset group count for stable ID generation
        // Don't clear lastProcessedGroups - let groups stay "processed" to avoid re-showing
      } else if (isSameGroupNav) {
        isReplaying = true; // All groups in fast replay mode
        interactivePrompts = [];
        groupStack = [];
        groupCount = 0; // Reset group count for stable ID generation
      } else if (isCrossGroupNav) {
        isReplaying = "smart"; // Smart mode: fast replay until target group
        targetGroup = targetStepGroup; // Set the target group for smart replay
        interactivePrompts = [];
        groupStack = [];
        groupCount = 0; // Reset group count for stable ID generation
      }

      try {
        asking = true;
        debugLogger.log('FLOW_START', { isReplaying, targetGroup, currentStep });
        const result = await flow({ group, text, confirm, BACK });
        asking = false;
        isReplaying = false; // Always clear replay mode after flow completes
        targetGroup = undefined; // Clear target group

        // If we've asked all interactive prompts in this path, we're done
        if (currentStep >= interactivePrompts.length) {
          debugLogger.log('FLOW_COMPLETE', { result, totalSteps: interactivePrompts.length });
          extendedUI.cleanup?.();
          return result;
        }
      } catch (e) {
        asking = false;
        if (e === BACK) {
          debugLogger.log('NAVIGATION_BACK', { currentStep, totalSteps: interactivePrompts.length });
          // Go back one step
          if (currentStep > 0) {
            currentStep -= 1;

            // Clean up group state for steps that are no longer reachable
            // Find groups associated with steps after the current step
            const unreachableGroups = new Set<string>();
            for (let i = currentStep; i < executionPath.length; i++) {
              const pathItem = executionPath[i];
              if (pathItem.groupContext) {
                unreachableGroups.add(pathItem.groupContext);
              }
            }

            // Remove unreachable groups from lastProcessedGroups
            for (const groupName of unreachableGroups) {
              lastProcessedGroups.delete(groupName);
              debugLogger.log('GROUP_UNPROCESSED', { groupName, reason: 'navigation_back', currentStep });
            }

            // Only clean up answers if doing full replay
            if (!canOptimize) {
              // Remove answers from prompts that are no longer reachable
              const currentPrompts = new Set(interactivePrompts);
              for (const key of Object.keys(answers)) {
                if (!currentPrompts.has(key)) {
                  delete answers[key];
                }
              }
            } else {
            }
          } else {
            // If we're at the first step, ignore the back operation completely
          }
        } else {
          throw e;
        }
      }

      // Clean up answers for prompts that were not reached in this replay
      if (!canOptimize) {
        const reachablePrompts = new Set(interactivePrompts);
        for (const key of Object.keys(answers)) {
          if (!reachablePrompts.has(key)) {
            delete answers[key];
          }
        }
      }
    }
  }

  // Create dynamic prompt functions for plugins
  const pluginPrompts: Record<string, any> = {};
  for (const plugin of globalRegistry.getAll()) {
    pluginPrompts[plugin.type] = async function(opts: any): Promise<any> {
      if (!asking) throw new Error(`${plugin.type}() must be called inside ask()`);
      return engine.step(plugin.type, opts, async (id) => {
        const currentGroup = groupStack[groupStack.length - 1];
        return plugin.prompt(opts, { extendedUI, currentGroup }, id);
      });
    };
  }


  // Re-discovery function for static groups
  async function rediscoverStaticGroupFields(groupId: string) {
    if (!isDiscoveryMode && staticGroupBodies.has(groupId)) {
      debugLogger.log('REDISCOVERY_START', { groupId });

      const body = staticGroupBodies.get(groupId)!;

      // Clear existing discovered fields for this group
      discoveredFields.delete(groupId);

      isDiscoveryMode = true;
      groupStack.push(groupId);

      try {
        await body();
      } catch (e) {
        debugLogger.log('REDISCOVERY_ERROR', { groupId, error: e });
      } finally {
        groupStack.pop();
        isDiscoveryMode = false;
      }

      const rediscoveredFields = discoveredFields.get(groupId);
      debugLogger.log('REDISCOVERY_END', { groupId, fieldCount: rediscoveredFields?.length || 0, fields: rediscoveredFields });
      return rediscoveredFields;
    }
    debugLogger.log('REDISCOVERY_SKIP', { groupId, reason: 'not_in_correct_state' });
    return discoveredFields.get(groupId);
  }

  const runtime = { ask, group, text, confirm, BACK, rediscoverStaticGroupFields, ...pluginPrompts };

  // Set the runtime context for plugins
  setCurrentRuntime(runtime);

  // Set the runtime reference in UI for re-discovery
  extendedUI.setRuntime?.(runtime);

  return runtime;
}

export { createRuntime as default };