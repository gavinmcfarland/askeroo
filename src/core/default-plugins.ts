/**
 * Default Plugins Loader
 *
 * This file imports all built-in plugins to ensure they're registered
 * with the global registry. By separating this from runtime-factory,
 * we decouple the runtime from specific plugin implementations.
 *
 * Plugins are auto-registered when imported because createPrompt()
 * calls globalRegistry.register() as a side effect.
 */

// Import all built-in plugins
import "../plugins/text/index.js";
import "../plugins/confirm/index.js";
import "../plugins/multi/index.js";
import "../plugins/note/index.js";
import "../plugins/radio/index.js";
import "../plugins/tasks/index.js";
import "../plugins/completed-fields/index.js";
import "../plugins/group/index.js";
import "../plugins/ask/index.js";

/**
 * This file has no exports - it exists purely to load plugins.
 * Import this file to ensure all default plugins are registered.
 */
