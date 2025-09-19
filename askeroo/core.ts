import { createRuntime } from '../src/core.js';
import { ui } from '../src/ui.js';
import { simpleUI } from '../src/simple-ui.js';

// Export the runtime with Ink UI by default
const { ask, group, text, confirm, BACK } = createRuntime(ui);

export { ask, group, text, confirm, BACK };

// Also export the runtime factory and simple UI for flexibility
export { createRuntime } from '../src/core.js';
export { simpleUI };