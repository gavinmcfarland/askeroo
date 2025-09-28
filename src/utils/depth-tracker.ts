// Runtime execution context tracking for conditional depth detection
// This approach tracks the actual conditional nesting during execution
// instead of trying to map AST positions to runtime callsites

let currentDepth = 0;
const depthStack: number[] = [];

// Global execution context for tracking conditional depth
export class DepthTracker {
  private static instance: DepthTracker;
  private currentDepth = 0;

  static getInstance(): DepthTracker {
    if (!DepthTracker.instance) {
      DepthTracker.instance = new DepthTracker();
    }
    return DepthTracker.instance;
  }

  getCurrentDepth(): number {
    return this.currentDepth;
  }

  enterConditional(): void {
    this.currentDepth++;
    if (process.env.DEBUG_DEPTH) {
      console.log(`📈 Entering conditional, depth now: ${this.currentDepth}`);
    }
  }

  exitConditional(): void {
    if (this.currentDepth > 0) {
      this.currentDepth--;
      if (process.env.DEBUG_DEPTH) {
        console.log(`📉 Exiting conditional, depth now: ${this.currentDepth}`);
      }
    }
  }

  reset(): void {
    this.currentDepth = 0;
    if (process.env.DEBUG_DEPTH) {
      console.log(`🔄 Reset depth tracker to 0`);
    }
  }
}

// Proxy function wrapper that tracks conditional execution
export function withConditionalDepth<T>(
  condition: boolean | (() => boolean),
  callback: () => T
): T {
  const tracker = DepthTracker.getInstance();

  const shouldExecute = typeof condition === 'function' ? condition() : condition;

  if (shouldExecute) {
    tracker.enterConditional();
    try {
      return callback();
    } finally {
      tracker.exitConditional();
    }
  } else {
    // If condition is false, we still need to return something
    // This should only be used in scenarios where the callback is definitely called
    throw new Error('withConditionalDepth called with false condition - this should not happen in normal flow');
  }
}

// Async version of withConditionalDepth
export async function withConditionalDepthAsync<T>(
  condition: boolean | (() => boolean) | (() => Promise<boolean>),
  callback: () => Promise<T>
): Promise<T> {
  const tracker = DepthTracker.getInstance();

  const shouldExecute = typeof condition === 'function' ? await condition() : condition;

  if (shouldExecute) {
    tracker.enterConditional();
    try {
      return await callback();
    } finally {
      tracker.exitConditional();
    }
  } else {
    // If condition is false, we still need to return something
    // This should only be used in scenarios where the callback is definitely called
    throw new Error('withConditionalDepthAsync called with false condition - this should not happen in normal flow');
  }
}

// Helper to conditionally execute code with depth tracking
export function conditional<T>(condition: boolean, callback: () => T): T | undefined {
  if (condition) {
    return withConditionalDepth(() => true, callback);
  }
  return undefined;
}

// Async version of conditional
export async function conditionalAsync<T>(condition: boolean, callback: () => Promise<T>): Promise<T | undefined> {
  if (condition) {
    return await withConditionalDepthAsync(() => true, callback);
  }
  return undefined;
}

// Helper to get current depth without needing AST parsing
export function getCurrentConditionalDepth(): number {
  return DepthTracker.getInstance().getCurrentDepth();
}

// Reset depth when starting a new flow
export function resetDepthTracking(): void {
  DepthTracker.getInstance().reset();
}

// Legacy function kept for compatibility but will be replaced
export function parseDepthMapFromFunction(fn: Function): Map<string, number> {
  // Return empty map - we're not using AST-based tracking anymore
  return new Map();
}

// Legacy function kept for compatibility but will be replaced
export function getCallsiteLineCol(stackSkip = 2): { line: number; column: number } | null {
  // Return null - we're not using callsite tracking anymore
  return null;
}