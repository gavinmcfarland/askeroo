import { createRuntime } from './core.js';
import { ui } from './ui.js';

// Export runtime with Ink UI by default
const { ask, group, text, confirm, BACK } = createRuntime(ui);

export { ask, group, text, confirm, BACK };

// Export runtime factory and UI
export { createRuntime } from './core.js';
export { ui };