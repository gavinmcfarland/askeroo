export type Answers = Record<string, unknown>;

type PromptKind = "text" | "confirm" | "group";
type PromptOpts = { message: string; name?: string };

type UI = {
  text(msg: string, initial?: string, groupContext?: string): Promise<string | BackToken>;
  confirm(msg: string, initial?: boolean, groupContext?: string): Promise<boolean | BackToken>;
  showGroup(label: string): Promise<void> | void;
  clearGroup?(): void;
  cleanup?(): void;
};

type BackToken = { __back: true };
const BACK: BackToken = { __back: true };

type Engine = {
  step<T>(kind: PromptKind, opts: PromptOpts, askFn: () => Promise<T | BackToken>): Promise<T>;
  BACK: BackToken;
};

export function createRuntime(ui: UI) {
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

  // Checkpoint system: save flow state at group boundaries
  let checkpoints: Map<string, {
    answers: Answers;
    interactivePrompts: string[];
    executionPath: typeof executionPath;
    step: number;
  }> = new Map();

  const engine: Engine = {
    BACK,
    async step<T>(kind: PromptKind, opts: PromptOpts, askFn: () => Promise<T | BackToken>) {
      if (kind === "group") {
        let shouldShowGroup: boolean;

        if (isReplaying === "smart") {
          // Smart replay: show only the target group, fast replay others
          shouldShowGroup = opts.message === targetGroup && !lastProcessedGroups.has(opts.message);
        } else {
          // Normal logic: show if not replaying and not already processed
          shouldShowGroup = !isReplaying && (!lastProcessedGroups.has(opts.message) || currentStep >= interactivePrompts.length);
        }


        if (shouldShowGroup) {
          await ui.showGroup?.(opts.message);
          lastProcessedGroups.add(opts.message);
        } else if (isReplaying === "smart" && opts.message === targetGroup) {
          // For smart replay, still call showGroup for the target group to update UI state
          // even if it was already processed, to ensure correct group display
          await ui.showGroup?.(opts.message);
        }

        groupStack.push(opts.message);
        return undefined as T;
      }

      // This is an interactive prompt
      const stepIndex = interactivePrompts.length;
      // Use consistent ID format that matches UI layer
      const id = opts.name ?? `${kind}|${opts.message}`;

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
        return answers[id] as T;
      }

      // If this is the current step to ask, prompt the user
      if (stepIndex === currentStep) {
        const result = await askFn();
        if (isBack(result)) throw BACK;
        answers[id] = result;
        currentStep += 1;
        return result as T;
      }

      // If we have an answer for this step, use it
      if (id in answers) {
        return answers[id] as T;
      }

      // This shouldn't happen in normal flow, but handle it defensively
      const result = await askFn();
      if (isBack(result)) throw BACK;
      answers[id] = result;
      currentStep = stepIndex + 1;
      return result as T;
    },
  };

  function isBack<T>(x: T | BackToken): x is BackToken {
    return typeof x === "object" && x !== null && (x as any).__back === true;
  }

  async function group(opts: PromptOpts, body: () => Promise<any>) {
    if (!asking) throw new Error("group() must be called inside ask()");
    await engine.step("group", opts, async () => undefined);
    try {
      return await body();
    } finally {
      ui.clearGroup?.();
    }
  }

  async function text(opts: PromptOpts): Promise<string> {
    if (!asking) throw new Error("text() must be called inside ask()");
    return engine.step("text", opts, () => {
      const currentGroup = groupStack[groupStack.length - 1];
      return ui.text(opts.message, undefined, currentGroup);
    });
  }

  async function confirm(opts: PromptOpts): Promise<boolean> {
    if (!asking) throw new Error("confirm() must be called inside ask()");
    return engine.step("confirm", opts, () => {
      const currentGroup = groupStack[groupStack.length - 1];
      return ui.confirm(opts.message, undefined, currentGroup);
    });
  }

  async function ask<T>(flow: (api: { group: typeof group; text: typeof text; confirm: typeof confirm; BACK: BackToken }) => Promise<T>): Promise<T> {
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
        // Don't clear lastProcessedGroups - let groups stay "processed" to avoid re-showing
      } else if (isSameGroupNav) {
        isReplaying = true; // All groups in fast replay mode
        interactivePrompts = [];
        groupStack = [];
      } else if (isCrossGroupNav) {
        isReplaying = "smart"; // Smart mode: fast replay until target group
        targetGroup = targetStepGroup; // Set the target group for smart replay
        interactivePrompts = [];
        groupStack = [];
      }

      try {
        asking = true;
        const result = await flow({ group, text, confirm, BACK });
        asking = false;
        isReplaying = false; // Always clear replay mode after flow completes
        targetGroup = undefined; // Clear target group

        // If we've asked all interactive prompts in this path, we're done
        if (currentStep >= interactivePrompts.length) {
          ui.cleanup?.();
          return result;
        }
      } catch (e) {
        asking = false;
        if (e === BACK) {
          // Go back one step
          if (currentStep > 0) {
            currentStep -= 1;

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