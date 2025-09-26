// Core plugins that are essential to the system
// These are loaded automatically by the runtime

// Import core plugins - these self-register when imported
import "./text/index.js";
import "./confirm/index.js";
import "./multi/index.js";
import "./note/index.js";
import "./completed-fields/index.js";
import "./radio/index.js";

export { globalRegistry, registerPlugin, createPlugin } from "../registry.js";
