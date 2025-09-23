import { createRuntime } from './core.js';
import { ui } from './ui.js';

// Create runtime lazily to ensure all plugins are loaded first
let runtime: any = null;

function ensureRuntime() {
  if (!runtime) {
    runtime = createRuntime(ui);
  }
  return runtime;
}

// Export lazy runtime functions
export const ask = (...args: any[]) => ensureRuntime().ask(...args);
export const group = (...args: any[]) => ensureRuntime().group(...args);
export const text = (...args: any[]) => ensureRuntime().text(...args);
export const confirm = (...args: any[]) => ensureRuntime().confirm(...args);
// BACK is just a simple token, doesn't need lazy loading
export const BACK = { __back: true };

// Export runtime factories and UI
export { createRuntime } from './core.js';
export { createReactiveRuntime } from './reactive-core.js';
export { ui };