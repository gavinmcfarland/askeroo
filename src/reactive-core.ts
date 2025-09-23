import { debugLogger } from './debug.js';
import { globalRegistry, setCurrentRuntime } from './registry.js';
import {
  ReactiveRuntimeEngine,
  FieldChangeEvent,
  FieldMetadata
} from './reactive-runtime.js';

export type Answers = Record<string, unknown>;

type PromptKind = "text" | "confirm" | "group" | string;
type PromptOpts = { message: string; id?: string };
type GroupOpts = {
  message?: string;
  id?: string;
  flow?: 'phase' | 'static';
  discovery?: {
    mode?: 'upfront' | 'reactive' | 'hybrid';
    triggers?: string[] | { [fieldMessage: string]: string }; // Allow field message -> trigger name mapping
    debounceMs?: number;
  };
};

type UI = {
  text(msg: string, initial?: string, groupContext?: string, id?: string): Promise<string | BackToken>;
  confirm(msg: string, initial?: boolean, groupContext?: string, id?: string): Promise<boolean | BackToken>;
  showGroup(label: string | undefined, flow?: 'phase' | 'static', id?: string, discoveredFields?: Array<{id: string, message: string, type: string}>): Promise<void> | void;
  clearGroup?(): void;
  cleanup?(): void;
  // Reactive UI methods
  onFieldChange?(fieldId: string, value: unknown, groupId: string): Promise<void>;
  updateStaticGroupFields?(groupId: string, fields: FieldMetadata[]): Promise<void>;
  [key: string]: any;
};

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

type Engine = {
  step<T>(kind: PromptKind, opts: PromptOpts | GroupOpts, askFn: (id: string) => Promise<T | BackToken>): Promise<T>;
  BACK: BackToken;
};

// Enhanced runtime with reactive capabilities
export function createReactiveRuntime(ui: UI) {
  debugLogger.log('REACTIVE_RUNTIME_CREATE', { ui: typeof ui });

  // Initialize reactive engine
  const reactiveEngine = new ReactiveRuntimeEngine();

  // Connect UI to reactive engine for updates
  reactiveEngine.uiInstance = ui;

  // Extend UI with plugin handlers
  const pluginHandlers = globalRegistry.getUIHandlers();
  const extendedUI = {
    ...ui,
    ...pluginHandlers,
    // Add reactive UI integration
    onFieldChange: async (fieldId: string, value: unknown, groupId: string) => {
      debugLogger.log('REACTIVE_FIELD_CHANGE_TRIGGERED', { fieldId, value, groupId });

      // Update the answers immediately
      answers[fieldId] = value;

      // Check if this group has reactive discovery enabled
      debugLogger.log('REACTIVE_FIELD_CHANGE_CHECK', {
        fieldId,
        groupId,
        hasGroupBody: reactiveEngine.staticGroupBodies.has(groupId),
        hasConfig: groupDiscoveryConfig.has(groupId),
        extractedFieldName: getFieldNameFromId(fieldId)
      });

      if (reactiveEngine.staticGroupBodies.has(groupId) && groupDiscoveryConfig.has(groupId)) {
        const config = groupDiscoveryConfig.get(groupId);
        const extractedFieldName = getFieldNameFromId(fieldId);

        debugLogger.log('REACTIVE_TRIGGER_CHECK', {
          fieldId,
          extractedFieldName,
          triggers: config.triggers,
          mode: config.mode,
          triggerMatch: isTriggerField(config.triggers, extractedFieldName)
        });

        if (config?.mode === 'reactive' && isTriggerField(config.triggers, extractedFieldName)) {
          debugLogger.log('REACTIVE_REDISCOVERY_TRIGGERED', { fieldId, groupId, triggers: config.triggers });

          // Re-run discovery for this group
          await rediscoverStaticGroupFields(groupId);

          // Trigger UI update with new fields
          const newFields = reactiveEngine.discoveredFields.get(groupId) || [];
          if (ui.updateStaticGroupFields) {
            await ui.updateStaticGroupFields(groupId, newFields);
          }
        }
      }

      // Call original reactive engine handler
      await reactiveEngine.handleFieldValueChange(fieldId, value, groupId);

      // Call original UI handler if it exists
      if (ui.onFieldChange) {
        await ui.onFieldChange(fieldId, value, groupId);
      }
    }
  };

  // Original core state (maintained for compatibility)
  const answers: Answers = reactiveEngine.answers;
  let interactivePrompts: string[] = reactiveEngine.interactivePrompts;
  let currentStep = reactiveEngine.currentStep;
  let asking = reactiveEngine.asking;
  let isReplaying: boolean | "smart" = false;
  let targetGroup: string | undefined;

  // Reactive discovery state (using existing reactive engine state)
  let groupDiscoveryConfig: Map<string, any> = new Map();
  let isDiscoveryMode = false;
  let fieldIdToNameMap: Map<string, string> = new Map(); // Maps field IDs to field names for triggers

  // Helper function to extract field name from field message
  function extractFieldNameFromMessage(message: string): string {
    // Generic approach: extract the main concept from the field message
    // Remove common words and punctuation, take the first meaningful word
    const cleanMessage = message
      .toLowerCase()
      .replace(/[()]/g, '') // Remove parentheses
      .replace(/\?/g, '') // Remove question marks
      .trim();

    // Split into words and take the first meaningful word
    const words = cleanMessage.split(/\s+/);
    const meaningfulWords = words.filter(word =>
      word.length > 2 && // Skip very short words
      !['the', 'a', 'an', 'is', 'are', 'to', 'for', 'of', 'in', 'on', 'at', 'by'].includes(word)
    );

    // Return the first meaningful word, or first word as fallback
    return meaningfulWords[0] || words[0] || 'field';
  }

  // Helper function to check if a field name matches the triggers configuration
  function isTriggerField(triggers: string[] | { [fieldMessage: string]: string } | undefined, fieldName: string): boolean {
    if (!triggers) return false;

    if (Array.isArray(triggers)) {
      // Simple array of trigger field names
      return triggers.includes(fieldName);
    } else {
      // Object mapping - check if fieldName is in the values
      return Object.values(triggers).includes(fieldName);
    }
  }

  // Helper function to extract field name from field ID
  function getFieldNameFromId(fieldId: string): string {
    // First try to look up the field name from our mapping
    const mappedName = fieldIdToNameMap.get(fieldId);
    if (mappedName) {
      return mappedName;
    }

    // Fallback to extracting from field type
    const parts = fieldId.split('|');
    return parts[0] || fieldId;
  }

  // Re-discovery function for static groups
  async function rediscoverStaticGroupFields(groupId: string) {
    if (reactiveEngine.staticGroupBodies.has(groupId)) {
      debugLogger.log('REACTIVE_REDISCOVERY_START', { groupId });
      const body = reactiveEngine.staticGroupBodies.get(groupId)!;

      // Clear existing discovered fields for this group
      reactiveEngine.discoveredFields.delete(groupId);

      // Temporarily add group to stack for discovery
      const originalStackLength = reactiveEngine.groupStack.length;
      reactiveEngine.groupStack.push(groupId);

      try {
        // Set discovery mode and run the group body
        isDiscoveryMode = true;
        await body();
        debugLogger.log('REACTIVE_REDISCOVERY_SUCCESS', {
          groupId,
          fieldsFound: reactiveEngine.discoveredFields.get(groupId)?.length || 0
        });
      } catch (error) {
        debugLogger.log('REACTIVE_REDISCOVERY_ERROR', { groupId, error });
      } finally {
        // Restore original state
        reactiveEngine.groupStack.splice(originalStackLength);
        isDiscoveryMode = false;
      }
    }
  }

  // Track execution context
  let executionPath: Array<{
    id: string;
    kind: PromptKind;
    groupContext?: string;
    stepIndex: number;
  }> = [];

  let groupStack: string[] = reactiveEngine.groupStack;
  let lastProcessedGroups: Set<string> = new Set();
  let phaseGroups: Map<string, 'phase'> = new Map();
  let staticGroups: Map<string, 'static'> = new Map();
  let groupCount = 0;
  let discoveredFields = reactiveEngine.discoveredFields;
  let staticGroupBodies = reactiveEngine.staticGroupBodies;

  // Generate stable ID (enhanced for reactive)
  function generateStableId(kind: PromptKind, message: string, groupStack: string[], stepIndex: number): string {
    const parts: string[] = [kind];

    if (groupStack.length > 0) {
      const currentGroup = groupStack[groupStack.length - 1];
      parts.push(`group:${currentGroup}`);
    }

    const messageHash = simpleHash(message);
    parts.push(`msg:${messageHash}`);

    if (message) {
      // For fields with messages, prioritize content-based stability
    } else {
      parts.push(`step:${stepIndex}`);
    }

    return parts.join('|');
  }

  function simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  function getGroupIdentifier(opts: GroupOpts, groupStack: string[], executionContext: { groupCount: number }): string {
    if (opts.id) return opts.id;
    if (opts.message) return opts.message;

    const depth = groupStack.length;
    const groupIndex = executionContext.groupCount;
    const flowType = opts.flow || 'sequential';

    return `group_${depth}_${groupIndex}_${flowType}`;
  }

  const engine: Engine = {
    BACK,
    async step<T>(kind: PromptKind, opts: PromptOpts | GroupOpts, askFn: (id: string) => Promise<T | BackToken>) {
      debugLogger.log('REACTIVE_ENGINE_STEP', {
        kind,
        opts,
        currentStep,
        groupStack: [...groupStack],
        isReplaying,
        reactivePhase: reactiveEngine.state?.phase
      });

      if (kind === "group") {
        const groupOpts = opts as GroupOpts;
        groupCount++;

        const groupId = getGroupIdentifier(groupOpts, groupStack, { groupCount });
        let shouldShowGroup: boolean;

        // Track group types
        if (groupOpts.flow === 'phase') {
          phaseGroups.set(groupId, 'phase');
        }

        if (groupOpts.flow === 'static') {
          staticGroups.set(groupId, 'static');
        }

        // Set up reactive handlers for static groups
        if (groupOpts.flow === 'static' && groupOpts.discovery?.mode === 'reactive') {
          // Store the discovery configuration
          debugLogger.log('REACTIVE_CONFIG_STORED', { groupId, discovery: groupOpts.discovery });
          groupDiscoveryConfig.set(groupId, groupOpts.discovery);
          setupReactiveHandlers(groupId, groupOpts);
        }

        if (isReplaying === "smart") {
          const isTargetOrAfter = groupId === targetGroup ||
                                 (!!targetGroup && lastProcessedGroups.has(targetGroup));
          shouldShowGroup = isTargetOrAfter && !lastProcessedGroups.has(groupId);
        } else {
          shouldShowGroup = !isReplaying && (!lastProcessedGroups.has(groupId) || currentStep >= interactivePrompts.length);
        }

        if (shouldShowGroup) {
          debugLogger.log('REACTIVE_GROUP_SHOW', {
            groupId,
            groupMessage: groupOpts.message,
            flow: groupOpts.flow,
            discoveryMode: groupOpts.discovery?.mode
          });

          const fields = groupOpts.flow === 'static' ? discoveredFields.get(groupId) : undefined;
          await extendedUI.showGroup?.(groupOpts.message, groupOpts.flow, groupId, fields);
          lastProcessedGroups.add(groupId);
          await askFn(generateStableId("group", groupId, groupStack, 0));
        } else {
          debugLogger.log('REACTIVE_GROUP_SKIP', { groupId, groupMessage: groupOpts.message, shouldShowGroup, isReplaying });
        }

        groupStack.push(groupId);
        return undefined as T;
      }

      // Handle interactive prompts (enhanced for reactive)
      const stepIndex = interactivePrompts.length;
      const effectiveStepIndex = isDiscoveryMode ? 0 : stepIndex;
      const id = opts.id ?? generateStableId(kind, opts.message || `${kind}-${effectiveStepIndex}`, groupStack, effectiveStepIndex);

      // Track field names for reactive trigger matching
      if (opts.message && groupStack.length > 0) {
        const currentGroupId = groupStack[groupStack.length - 1];
        const config = groupDiscoveryConfig.get(currentGroupId);

        let fieldName: string;
        if (config && typeof config.triggers === 'object' && !Array.isArray(config.triggers)) {
          // User provided explicit field message -> trigger name mapping
          fieldName = config.triggers[opts.message] || extractFieldNameFromMessage(opts.message);
        } else {
          // Use automatic extraction
          fieldName = extractFieldNameFromMessage(opts.message);
        }

        fieldIdToNameMap.set(id, fieldName);
        debugLogger.log('REACTIVE_FIELD_MAPPED', { id, fieldName, message: opts.message });
      }

      // Discovery mode handling
      if (isDiscoveryMode) {
        const currentGroupId = groupStack[groupStack.length - 1];
        debugLogger.log('REACTIVE_DISCOVERY_FIELD', { currentGroupId, id, message: opts.message, kind });

        if (currentGroupId) {
          const fields = discoveredFields.get(currentGroupId) || [];
          if (!fields.some(f => f.id === id)) {
            const fieldMetadata: FieldMetadata = {
              id,
              message: opts.message || `${kind} field`,
              type: kind,
              groupId: currentGroupId
            };

            fields.push(fieldMetadata);
            discoveredFields.set(currentGroupId, fields);
            debugLogger.log('REACTIVE_DISCOVERY_FIELD_ADDED', { currentGroupId, fieldCount: fields.length });
          }
        }

        // Use current field values during discovery for reactive discovery
        let placeholderValue: any;
        if (kind === 'confirm') {
          placeholderValue = (id in answers) ? answers[id] : false;
        } else {
          if (id in answers) {
            placeholderValue = answers[id];
          } else {
            placeholderValue = '';
          }
        }

        debugLogger.log('REACTIVE_DISCOVERY_PLACEHOLDER', { kind, message: opts.message, placeholderValue });
        return placeholderValue as T;
      }

      interactivePrompts.push(id);

      // Track execution path
      executionPath.push({
        id,
        kind,
        groupContext: groupStack[groupStack.length - 1],
        stepIndex
      });

      // Standard execution flow
      if (stepIndex < currentStep && id in answers) {
        debugLogger.log('REACTIVE_PROMPT_REPLAY', { id, stepIndex, currentStep, answer: answers[id] });
        return answers[id] as T;
      }

      if (stepIndex === currentStep) {
        debugLogger.log('REACTIVE_PROMPT_ASK', { id, stepIndex, message: opts.message });
        const result = await askFn(id);
        if (isBack(result)) {
          debugLogger.log('REACTIVE_PROMPT_BACK', { id, stepIndex });
          throw BACK;
        }

        debugLogger.log('REACTIVE_PROMPT_ANSWER', { id, stepIndex, result });
        answers[id] = result;
        currentStep += 1;

        // Trigger reactive field change if in a reactive group
        const currentGroupId = groupStack[groupStack.length - 1];
        if (currentGroupId && staticGroups.has(currentGroupId)) {
          const groupBody = staticGroupBodies.get(currentGroupId);
          if (groupBody) {
            // Check if this is a reactive group
            const isReactiveGroup = true; // Would be determined from group options
            if (isReactiveGroup) {
              await extendedUI.onFieldChange?.(id, result, currentGroupId);
            }
          }
        }

        return result as T;
      }

      // Fallback handling
      if (id in answers) {
        debugLogger.log('REACTIVE_PROMPT_CACHED', { id, stepIndex, answer: answers[id] });
        return answers[id] as T;
      }

      const result = await askFn(id);
      if (isBack(result)) throw BACK;
      answers[id] = result;
      currentStep = stepIndex + 1;
      return result as T;
    },
  };

  function setupReactiveHandlers(groupId: string, opts: GroupOpts) {
    debugLogger.log('REACTIVE_SETUP_HANDLERS', { groupId, opts: opts.discovery });

    // Register field change handlers for reactive discovery
    reactiveEngine.registerFieldChangeHandler(groupId, {
      id: `rediscover-${groupId}`,
      condition: (event: FieldChangeEvent) => {
        // Check if this field change should trigger rediscovery
        const triggers = opts.discovery?.triggers;
        if (!triggers) return true;

        const fieldName = getFieldNameFromId(event.fieldId);
        return isTriggerField(triggers, fieldName);
      },
      action: 'rediscover',
      debounceMs: opts.discovery?.debounceMs || 300,
      priority: 10
    });

    // Register UI update handler
    reactiveEngine.registerFieldChangeHandler(groupId, {
      id: `ui-update-${groupId}`,
      condition: () => true, // Always update UI
      action: 'update_ui',
      priority: 5
    });
  }

  function isBack<T>(x: T | BackToken): x is BackToken {
    return typeof x === "object" && x !== null && (x as any).__back === true;
  }

  // Enhanced discovery for static groups (supports both upfront and reactive)
  async function runStaticGroupDiscovery(opts: GroupOpts, body: () => Promise<any>) {
    const nextGroupCount = groupCount + 1;
    const discoveryGroupId = getGroupIdentifier(opts, groupStack, { groupCount: nextGroupCount });

    debugLogger.log('REACTIVE_DISCOVERY_START', {
      groupId: discoveryGroupId,
      mode: opts.discovery?.mode || 'upfront',
      answersCount: Object.keys(answers).length
    });

    isDiscoveryMode = true;
    groupStack.push(discoveryGroupId);

    try {
      if (opts.discovery?.mode === 'reactive') {
        // For reactive mode, do minimal initial discovery
        await body();
      } else {
        // For upfront mode, do comprehensive discovery (existing logic)
        await body();

        // Run additional discovery passes for conditional fields
        const currentFields = discoveredFields.get(discoveryGroupId) || [];
        const textFields = currentFields.filter(f => f.type === 'text');

        for (const textField of textFields) {
          const testValues = ['admin', 'user', 'premium', 'basic', 'yes', 'no', 'true', 'false'];

          for (const testValue of testValues) {
            const fieldsBefore = discoveredFields.get(discoveryGroupId)?.length || 0;

            answers[textField.id] = testValue;
            debugLogger.log('REACTIVE_DISCOVERY_TEST_VALUE', { field: textField.message, value: testValue });

            try {
              await body();
            } catch (e) {
              debugLogger.log('REACTIVE_DISCOVERY_TEST_ERROR', { field: textField.message, value: testValue, error: e });
            }

            const fieldsAfter = discoveredFields.get(discoveryGroupId)?.length || 0;
            if (fieldsAfter > fieldsBefore) {
              debugLogger.log('REACTIVE_DISCOVERY_NEW_FIELDS', {
                field: textField.message,
                value: testValue,
                newFields: fieldsAfter - fieldsBefore
              });
            }

            delete answers[textField.id];
          }
        }
      }

    } catch (e) {
      debugLogger.log('REACTIVE_DISCOVERY_ERROR', { groupId: discoveryGroupId, error: e });
    } finally {
      groupStack.pop();
      isDiscoveryMode = false;
    }

    const discoveredFieldsForGroup = discoveredFields.get(discoveryGroupId);
    debugLogger.log('REACTIVE_DISCOVERY_END', {
      groupId: discoveryGroupId,
      fieldCount: discoveredFieldsForGroup?.length || 0,
      fields: discoveredFieldsForGroup
    });
  }

  // Standard group, text, confirm functions (enhanced)
  async function group(opts: GroupOpts, body: () => Promise<any>) {
    if (!asking) throw new Error("group() must be called inside ask()");

    // Store group body for potential re-discovery
    if (opts.flow === 'static') {
      const nextGroupCount = groupCount + 1;
      const groupId = getGroupIdentifier(opts, groupStack, { groupCount: nextGroupCount });
      staticGroupBodies.set(groupId, body);

      await runStaticGroupDiscovery(opts, body);
    }

    await engine.step("group", opts, async () => undefined);

    try {
      return await body();
    } finally {
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

  // Main ask function (enhanced)
  async function ask<T>(flow: (api: { group: typeof group; text: typeof text; confirm: typeof confirm; BACK: BackToken }) => Promise<T>): Promise<T> {
    debugLogger.log('REACTIVE_ASK_START', { currentStep, answersCount: Object.keys(answers).length });

    while (true) {
      // Navigation logic (preserved from original)
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

      if (!canOptimize) {
        isReplaying = false;
        interactivePrompts = [];
        executionPath = [];
        groupStack = [];
        groupCount = 0;
      } else if (isSameGroupNav) {
        isReplaying = true;
        interactivePrompts = [];
        groupStack = [];
        groupCount = 0;
      } else if (isCrossGroupNav) {
        isReplaying = "smart";
        targetGroup = targetStepGroup;
        interactivePrompts = [];
        groupStack = [];
        groupCount = 0;
      }

      try {
        asking = true;
        debugLogger.log('REACTIVE_FLOW_START', { isReplaying, targetGroup, currentStep });
        const result = await flow({ group, text, confirm, BACK });
        asking = false;
        isReplaying = false;
        targetGroup = undefined;

        if (currentStep >= interactivePrompts.length) {
          debugLogger.log('REACTIVE_FLOW_COMPLETE', { result, totalSteps: interactivePrompts.length });
          extendedUI.cleanup?.();
          reactiveEngine.cleanup();
          return result;
        }
      } catch (e) {
        asking = false;
        if (e === BACK) {
          debugLogger.log('REACTIVE_NAVIGATION_BACK', { currentStep, totalSteps: interactivePrompts.length });

          if (currentStep > 0) {
            currentStep -= 1;

            // Clean up group state for unreachable steps
            const unreachableGroups = new Set<string>();
            for (let i = currentStep; i < executionPath.length; i++) {
              const pathItem = executionPath[i];
              if (pathItem.groupContext) {
                unreachableGroups.add(pathItem.groupContext);
              }
            }

            for (const groupName of unreachableGroups) {
              lastProcessedGroups.delete(groupName);
              debugLogger.log('REACTIVE_GROUP_UNPROCESSED', { groupName, reason: 'navigation_back', currentStep });
            }

            if (!canOptimize) {
              const currentPrompts = new Set(interactivePrompts);
              for (const key of Object.keys(answers)) {
                if (!currentPrompts.has(key)) {
                  delete answers[key];
                }
              }
            }
          }
        } else {
          throw e;
        }
      }

      // Cleanup unreachable answers
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


  // Create plugin prompts
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

  const runtime = {
    ask,
    group,
    text,
    confirm,
    BACK,
    rediscoverStaticGroupFields,
    // Reactive-specific methods
    getReactiveMetrics: () => reactiveEngine.getMetrics(),
    getReactiveState: () => reactiveEngine.state,
    ...pluginPrompts
  };

  // Set runtime context
  setCurrentRuntime(runtime);
  if ('setRuntime' in extendedUI && typeof extendedUI.setRuntime === 'function') {
    extendedUI.setRuntime(runtime);
  }

  return runtime;
}

export { createReactiveRuntime as default };