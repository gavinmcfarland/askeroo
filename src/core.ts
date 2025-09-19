export type Answers = Record<string, unknown>;

type PromptKind = "text" | "confirm" | "group";
type PromptOpts = { message: string; name?: string };

type UI = {
  text(msg: string, initial?: string): Promise<string | BackToken>;
  confirm(msg: string, initial?: boolean): Promise<boolean | BackToken>;
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
  let isReplaying = false; // Track if we're in replay mode

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
        // Only call showGroup if we're not replaying or if this group hasn't been processed
        const shouldShowGroup = !isReplaying && (!lastProcessedGroups.has(opts.message) || currentStep >= interactivePrompts.length);

        console.log("👥 Group step:", opts.message, "shouldShow:", shouldShowGroup, "alreadyProcessed:", lastProcessedGroups.has(opts.message), "isReplaying:", isReplaying);

        if (shouldShowGroup) {
          await ui.showGroup?.(opts.message);
          lastProcessedGroups.add(opts.message);
        }

        groupStack.push(opts.message);
        return undefined as T;
      }

      // This is an interactive prompt
      const stepIndex = interactivePrompts.length;
      const id = opts.name ?? `${kind}:${opts.message}:${stepIndex}`;
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
    return engine.step("text", opts, () => ui.text(opts.message));
  }

  async function confirm(opts: PromptOpts): Promise<boolean> {
    if (!asking) throw new Error("confirm() must be called inside ask()");
    return engine.step("confirm", opts, () => ui.confirm(opts.message));
  }

  async function ask<T>(flow: (api: { group: typeof group; text: typeof text; confirm: typeof confirm; BACK: BackToken }) => Promise<T>): Promise<T> {
    while (true) {
      // Check if we can optimize back navigation within same group
      // We need to check if the step we're going back TO (currentStep) is in the same group
      // as the step we came FROM (currentStep + 1, before we decremented)
      const targetStepGroup = executionPath[currentStep]?.groupContext;
      const sourceStepGroup = executionPath[currentStep + 1]?.groupContext;

      const canOptimizeBack = currentStep >= 0 &&
        targetStepGroup &&
        sourceStepGroup &&
        targetStepGroup === sourceStepGroup;

      console.log("🔄 Navigation check:", {
        currentStep,
        canOptimizeBack,
        targetStepGroup,
        sourceStepGroup,
        executionPathLength: executionPath.length,
        targetStep: executionPath[currentStep],
        sourceStep: executionPath[currentStep + 1]
      });

      // For simple back navigation within same group, keep execution context
      if (!canOptimizeBack) {
        console.log("📍 Using FULL REPLAY");
        isReplaying = false;
        // Full replay - reset all tracking
        interactivePrompts = [];
        executionPath = [];
        groupStack = [];
        // Don't clear lastProcessedGroups - let groups stay "processed" to avoid re-showing
      } else {
        console.log("⚡ Using OPTIMIZED BACK NAVIGATION - FAST REPLAY MODE");
        isReplaying = true; // Enable fast replay mode
        // Optimized back - just reset the current execution state
        interactivePrompts = [];
        groupStack = [];
      }

      try {
        asking = true;
        const result = await flow({ group, text, confirm, BACK });
        asking = false;
        isReplaying = false; // Always clear replay mode after flow completes

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
            console.log("⬅️ Going back from step", currentStep, "to", currentStep - 1);
            currentStep -= 1;

            // Only clean up answers if doing full replay
            if (!canOptimizeBack) {
              console.log("🧹 Cleaning up unreachable answers");
              // Remove answers from prompts that are no longer reachable
              const currentPrompts = new Set(interactivePrompts);
              for (const key of Object.keys(answers)) {
                if (!currentPrompts.has(key)) {
                  delete answers[key];
                }
              }
            } else {
              console.log("✅ Skipping cleanup for optimized navigation");
            }
          } else {
            console.log("🚫 Already at first step, ignoring back");
            // If we're at the first step, ignore the back operation completely
          }
        } else {
          throw e;
        }
      }

      // Clean up answers for prompts that were not reached in this replay
      if (!canOptimizeBack) {
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