// Enhanced exports with full back navigation support
export {
  ask,
  text,
  confirm,
  group,
  conditional,
  canGoBack,
  goBack,
  getFlowStateManager,
  getReplayEngine,
  getConditionalManager
} from './core-enhanced.js';

// Re-export types for enhanced usage
export type {
  FlowStep,
  FlowSnapshot,
  FlowReplayOptions,
  PromptConfig,
  GroupConfig,
  ConditionalState
} from './flow-state/types.js';

// Export utility classes for advanced usage
export { FlowStateManager } from './flow-state/FlowStateManager.js';
export { ReplayEngine } from './flow-state/ReplayEngine.js';
export { ConditionalManager } from './flow-state/ConditionalManager.js';