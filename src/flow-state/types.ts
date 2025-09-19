export interface FlowStep {
  id: string;
  type: 'prompt' | 'group_start' | 'group_end' | 'conditional';
  timestamp: number;

  // For prompts
  promptType?: 'text' | 'confirm';
  config?: any;
  value?: any;

  // For groups
  groupConfig?: any;
  groupId?: string;

  // For conditionals
  conditionId?: string;
  condition?: string;
  branchTaken?: 'then' | 'else';

  // Flow context snapshot
  flowSnapshot?: FlowSnapshot;
}

export interface FlowSnapshot {
  // Variables in scope at this point
  variables: Record<string, any>;

  // Function execution path (for debugging)
  executionPath: string[];

  // Group nesting state
  groupStack: GroupStackItem[];

  // Conditional states
  conditionalStates: ConditionalState[];
}

export interface GroupStackItem {
  groupId: string;
  config: any;
  startStepId: string;
  variables: Record<string, any>;
}

export interface ConditionalState {
  conditionId: string;
  expression: string;
  result: boolean;
  dependencies: string[]; // variable names this condition depends on
  stepId: string; // when this condition was evaluated
}

export interface BranchPath {
  conditionId: string;
  branchTaken: 'then' | 'else';
  branchSteps: string[]; // step IDs executed in this branch
}

export interface FlowReplayOptions {
  enableBackNavigation?: boolean;
  maxHistorySteps?: number;
  debugMode?: boolean;
}

export interface PromptConfig {
  message: string;
  name?: string; // for variable tracking
  placeholder?: string;
  validate?: (value: any) => boolean | string;
  initial?: any;
}

export interface GroupConfig {
  message: string;
  id?: string; // for group tracking
}

export type FlowFunction<T> = () => Promise<T>;