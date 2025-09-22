import { debugLogger } from './debug.js';

export type Answers = Record<string, unknown>;

type PromptKind = "text" | "confirm" | "group";
type PromptOpts = { message: string; id?: string };
type GroupOpts = { message?: string; id?: string; flow?: 'phase' | 'all' };

type UI = {
  text(msg: string, initial?: string, groupContext?: string, id?: string): Promise<string | BackToken>;
  confirm(msg: string, initial?: boolean, groupContext?: string, id?: string): Promise<boolean | BackToken>;
  showGroup(label: string | undefined, flow?: 'phase' | 'all', id?: string): Promise<void> | void;
  clearGroup?(): void;
  cleanup?(): void;
};

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

type Engine = {
  step<T>(kind: PromptKind, opts: PromptOpts | GroupOpts, askFn: (id: string) => Promise<T | BackToken>): Promise<T>;
  BACK: BackToken;
};

// Generate stable, deterministic ID based on execution context
function generateStableId(kind: PromptKind, message: string, groupStack: string[], stepIndex: number): string {
  const parts: string[] = [kind];

  // Add group context if we're in a group
  if (groupStack.length > 0) {
    const currentGroup = groupStack[groupStack.length - 1];
    parts.push(`group:${currentGroup}`);
  }

  // Add step index to ensure uniqueness within the same group
  parts.push(`step:${stepIndex}`);

  // Optionally add a hash of the message for additional uniqueness
  // This helps when fields have similar positions but different messages
  const messageHash = simpleHash(message);
  parts.push(`msg:${messageHash}`);

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
  let flowGroups: Map<string, 'all'> = new Map(); // Track groups with all flow
  let groupCount = 0; // Track total number of groups encountered for stable ID generation
  let isDiscovering = false; // Track if we're in discovery mode for flow groups
  let discoveryFieldIndex = 0; // Track field index during discovery


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

        // Track flow groups (all fields visible)
        if (groupOpts.flow === 'all') {
          flowGroups.set(groupId, 'all');
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
          await ui.showGroup?.(groupOpts.message, groupOpts.flow, groupId);
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
      const id = opts.id ?? generateStableId(kind, opts.message || `${kind}-${stepIndex}`, groupStack, stepIndex);


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

  async function group(opts: GroupOpts, body: () => Promise<any>) {
    if (!asking) throw new Error("group() must be called inside ask()");

    // For flow groups, run discovery mode first to collect all field definitions
    // This must happen BEFORE engine.step so fields are discovered before UI shows
    if (opts.flow === 'all') {
      const groupId = getGroupIdentifier(opts, groupStack, { groupCount: groupCount + 1 });
      console.log('Starting flow group discovery for:', groupId);
      groupStack.push(groupId);
      flowGroups.set(groupId, 'all'); // Ensure group is tracked as flow group
      isDiscovering = true;
      discoveryFieldIndex = 0; // Reset discovery field counter
      try {
        await body(); // Execute body in discovery mode to register all fields
        console.log('Flow group discovery completed for:', groupId, 'found', discoveryFieldIndex, 'fields');
      } catch (e) {
        console.log('Flow group discovery error:', e);
      }
      isDiscovering = false;
      groupStack.pop();
    }

    await engine.step("group", opts, async () => undefined);

    const groupId = getGroupIdentifier(opts, groupStack, { groupCount });

    try {
      return await body();
    } finally {
      ui.clearGroup?.();
    }
  }

  async function text(opts: PromptOpts): Promise<string> {
    if (!asking) throw new Error("text() must be called inside ask()");

    // If we're in discovery mode, just register the field and return placeholder
    const currentGroup = groupStack[groupStack.length - 1];
    if (isDiscovering && currentGroup && flowGroups.has(currentGroup)) {
      // Use the same ID generation logic as normal mode for consistency
      const stepIndex = interactivePrompts.length;
      const id = opts.id ?? generateStableId("text", opts.message, groupStack, stepIndex);
      console.log('Discovering text field:', opts.message, 'in group:', currentGroup, 'with id:', id);
      ui.text(opts.message, undefined, currentGroup, `${id}_preview`);
      // Add to interactivePrompts to maintain consistent step indexing
      interactivePrompts.push(id);
      return answers[id] as string || "";
    }

    return engine.step("text", opts, (id) => {
      return ui.text(opts.message, undefined, currentGroup, id);
    });
  }

  async function confirm(opts: PromptOpts): Promise<boolean> {
    if (!asking) throw new Error("confirm() must be called inside ask()");

    // If we're in discovery mode, just register the field and return placeholder
    const currentGroup = groupStack[groupStack.length - 1];
    if (isDiscovering && currentGroup && flowGroups.has(currentGroup)) {
      // Use the same ID generation logic as normal mode for consistency
      const stepIndex = interactivePrompts.length;
      const id = opts.id ?? generateStableId("confirm", opts.message, groupStack, stepIndex);
      console.log('Discovering confirm field:', opts.message, 'in group:', currentGroup, 'with id:', id);
      ui.confirm(opts.message, undefined, currentGroup, `${id}_preview`);
      // Add to interactivePrompts to maintain consistent step indexing
      interactivePrompts.push(id);
      return answers[id] as boolean || false;
    }

    return engine.step("confirm", opts, (id) => {
      return ui.confirm(opts.message, undefined, currentGroup, id);
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
          ui.cleanup?.();
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

  return { ask, group, text, confirm, BACK };
}

export { createRuntime as default };