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

  const engine: Engine = {
    BACK,
    async step<T>(kind: PromptKind, opts: PromptOpts, askFn: () => Promise<T | BackToken>) {
      if (kind === "group") {
        await ui.showGroup?.(opts.message);
        return undefined as T;
      }

      // This is an interactive prompt
      const stepIndex = interactivePrompts.length;
      const id = opts.name ?? `${kind}:${opts.message}:${stepIndex}`;
      interactivePrompts.push(id);

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
      interactivePrompts = [];
      try {
        asking = true;
        const result = await flow({ group, text, confirm, BACK });
        asking = false;

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

            // Remove answers from prompts that are no longer reachable
            // We'll collect the new set of reachable prompts on the next replay
            const currentPrompts = new Set(interactivePrompts);
            for (const key of Object.keys(answers)) {
              if (!currentPrompts.has(key)) {
                delete answers[key];
              }
            }
          } else {
            // If we're at the first step, ignore the back operation completely
          }
        } else {
          throw e;
        }
      }

      // Clean up answers for prompts that were not reached in this replay
      const reachablePrompts = new Set(interactivePrompts);
      for (const key of Object.keys(answers)) {
        if (!reachablePrompts.has(key)) {
          delete answers[key];
        }
      }
    }
  }

  return { ask, group, text, confirm, BACK };
}

export { createRuntime as default };