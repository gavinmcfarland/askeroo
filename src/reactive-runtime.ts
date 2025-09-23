import { debugLogger } from './debug.js';

// Core types for reactive runtime
export enum RuntimePhase {
  DISCOVERY = 'discovery',
  EXECUTION = 'execution',
  RE_DISCOVERY = 're_discovery',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

export interface FieldChangeEvent {
  fieldId: string;
  oldValue: unknown;
  newValue: unknown;
  groupId: string;
  timestamp: number;
  requestId: string;
}

export interface ExecutionCheckpoint {
  currentStep: number;
  interactivePrompts: string[];
  answers: Record<string, unknown>;
  groupStack: string[];
  fieldSequence: FieldMetadata[];
  timestamp: number;
}

export interface FieldMetadata {
  id: string;
  message: string;
  type: string;
  groupId?: string;
  dependencies?: string[];
}

export interface DiscoveryResult {
  fields: FieldMetadata[];
  fromCache: boolean;
  computeTimeMs: number;
  cacheKey: string;
}

export interface DiscoveryDiff {
  addedFields: FieldMetadata[];
  removedFields: FieldMetadata[];
  modifiedFields: FieldMetadata[];
  unchangedFields: FieldMetadata[];
}

// State machine for reactive runtime
export class ReactiveRuntimeState {
  public phase: RuntimePhase = RuntimePhase.DISCOVERY;
  public checkpoint: ExecutionCheckpoint | null = null;
  public pendingChanges = new Map<string, FieldChangeEvent>();
  public discoveryCache = new Map<string, DiscoveryResult>();
  public fieldChangeHandlers = new Map<string, Set<FieldChangeHandler>>();
  public metrics = new ReactiveMetrics();

  transition(newPhase: RuntimePhase, context?: any) {
    const oldPhase = this.phase;
    this.phase = newPhase;
    debugLogger.log('REACTIVE_STATE_TRANSITION', {
      from: oldPhase,
      to: newPhase,
      context
    });
  }

  reset() {
    this.phase = RuntimePhase.DISCOVERY;
    this.checkpoint = null;
    this.pendingChanges.clear();
    // Keep cache for performance
  }
}

// Field change handler interface
interface FieldChangeHandler {
  id: string;
  condition: (event: FieldChangeEvent) => boolean;
  action: 'rediscover' | 'validate' | 'update_ui';
  debounceMs?: number;
  priority: number;
}

// Performance metrics tracking
class ReactiveMetrics {
  private timers = new Map<string, number>();
  private counters = new Map<string, number>();

  startTimer(key: string) {
    this.timers.set(key, performance.now());
  }

  endTimer(key: string): number {
    const start = this.timers.get(key);
    if (!start) return 0;

    const duration = performance.now() - start;
    this.timers.delete(key);
    return duration;
  }

  increment(key: string, value = 1) {
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  getCounter(key: string): number {
    return this.counters.get(key) || 0;
  }

  reset() {
    this.timers.clear();
    this.counters.clear();
  }
}

// Debouncing utility for field changes
class FieldChangeDebouncer {
  private timers = new Map<string, NodeJS.Timeout>();
  private pendingEvents = new Map<string, FieldChangeEvent>();

  async debounce(
    event: FieldChangeEvent,
    handler: (event: FieldChangeEvent) => Promise<void>,
    debounceMs = 300
  ): Promise<void> {
    const key = `${event.groupId}:${event.fieldId}`;

    // Cancel previous timer for this field
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store the latest event
    this.pendingEvents.set(key, event);

    // Set new debounced timer
    const timer = setTimeout(async () => {
      const latestEvent = this.pendingEvents.get(key);
      if (latestEvent && latestEvent.timestamp === event.timestamp) {
        this.timers.delete(key);
        this.pendingEvents.delete(key);
        await handler(latestEvent);
      }
    }, debounceMs);

    this.timers.set(key, timer);
  }

  clearAll() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.pendingEvents.clear();
  }
}

// Main reactive runtime engine
export class ReactiveRuntimeEngine {
  public state = new ReactiveRuntimeState();
  private debouncer = new FieldChangeDebouncer();
  private discoveryEngine: IncrementalDiscoveryEngine | null = null;
  public uiInstance: any = null; // Reference to UI for triggering updates

  // Core runtime state (from original)
  public answers: Record<string, unknown> = {};
  public interactivePrompts: string[] = [];
  public currentStep = 0;
  public asking = false;
  public groupStack: string[] = [];
  public staticGroupBodies = new Map<string, () => Promise<any>>();
  public discoveredFields = new Map<string, FieldMetadata[]>();

  constructor() {
    this.discoveryEngine = new IncrementalDiscoveryEngine(this);
  }

  // Register field change handlers
  registerFieldChangeHandler(groupId: string, handler: FieldChangeHandler) {
    if (!this.state.fieldChangeHandlers.has(groupId)) {
      this.state.fieldChangeHandlers.set(groupId, new Set());
    }
    this.state.fieldChangeHandlers.get(groupId)!.add(handler);
  }

  // Main entry point for field value changes
  async handleFieldValueChange(
    fieldId: string,
    newValue: unknown,
    groupId: string
  ): Promise<void> {
    const oldValue = this.answers[fieldId];

    // Create change event
    const event: FieldChangeEvent = {
      fieldId,
      oldValue,
      newValue,
      groupId,
      timestamp: Date.now(),
      requestId: `${fieldId}-${Date.now()}`
    };

    debugLogger.log('REACTIVE_FIELD_CHANGE', event);
    this.state.metrics.increment('field_changes');

    // Update answers immediately
    this.answers[fieldId] = newValue;

    // Debounce and process the change
    await this.debouncer.debounce(
      event,
      (debouncedEvent) => this.processFieldChange(debouncedEvent),
      300
    );
  }

  private async processFieldChange(event: FieldChangeEvent): Promise<void> {
    try {
      this.state.metrics.startTimer('field_change_processing');

      // Get handlers for this group
      const handlers = this.state.fieldChangeHandlers.get(event.groupId) || new Set();

      // Find applicable handlers
      const applicableHandlers = Array.from(handlers)
        .filter(h => h.condition(event))
        .sort((a, b) => b.priority - a.priority); // Higher priority first

      debugLogger.log('REACTIVE_APPLICABLE_HANDLERS', {
        eventId: event.requestId,
        handlerCount: applicableHandlers.length
      });

      // Process handlers
      for (const handler of applicableHandlers) {
        await this.executeHandler(handler, event);
      }

    } catch (error) {
      this.state.metrics.increment('field_change_errors');
      debugLogger.log('REACTIVE_FIELD_CHANGE_ERROR', {
        eventId: event.requestId,
        error: error
      });
      throw error;

    } finally {
      const duration = this.state.metrics.endTimer('field_change_processing');
      debugLogger.log('REACTIVE_FIELD_CHANGE_COMPLETE', {
        eventId: event.requestId,
        durationMs: duration
      });
    }
  }

  private async executeHandler(
    handler: FieldChangeHandler,
    event: FieldChangeEvent
  ): Promise<void> {
    debugLogger.log('REACTIVE_EXECUTE_HANDLER', {
      handlerId: handler.id,
      action: handler.action,
      eventId: event.requestId
    });

    switch (handler.action) {
      case 'rediscover':
        await this.triggerRediscovery(event);
        break;
      case 'validate':
        await this.validateFieldChange(event);
        break;
      case 'update_ui':
        await this.updateUIForChange(event);
        break;
    }
  }

  private async triggerRediscovery(event: FieldChangeEvent): Promise<void> {
    if (!this.discoveryEngine) return;

    try {
      // Transition to re-discovery state
      this.state.transition(RuntimePhase.RE_DISCOVERY, {
        triggeredBy: event.fieldId
      });

      // Create checkpoint of current execution state
      this.state.checkpoint = this.createExecutionCheckpoint();

      // Run incremental discovery
      const discoveryDiff = await this.discoveryEngine.discoverFieldChanges(event);

      // Apply discovery changes
      await this.applyDiscoveryDiff(discoveryDiff, event.groupId);

      // Resume execution
      this.state.transition(RuntimePhase.EXECUTION);

    } catch (error) {
      // Rollback on error
      await this.rollbackToCheckpoint();
      this.state.transition(RuntimePhase.ERROR, { error });
      throw error;
    }
  }

  private createExecutionCheckpoint(): ExecutionCheckpoint {
    return {
      currentStep: this.currentStep,
      interactivePrompts: [...this.interactivePrompts],
      answers: { ...this.answers },
      groupStack: [...this.groupStack],
      fieldSequence: [], // Will be populated as we track fields
      timestamp: Date.now()
    };
  }

  private async rollbackToCheckpoint(): Promise<void> {
    if (!this.state.checkpoint) return;

    this.currentStep = this.state.checkpoint.currentStep;
    this.interactivePrompts = [...this.state.checkpoint.interactivePrompts];
    this.answers = { ...this.state.checkpoint.answers };
    this.groupStack = [...this.state.checkpoint.groupStack];

    debugLogger.log('REACTIVE_CHECKPOINT_ROLLBACK', {
      timestamp: this.state.checkpoint.timestamp
    });
  }

  private async validateFieldChange(event: FieldChangeEvent): Promise<void> {
    // Placeholder for field validation logic
    debugLogger.log('REACTIVE_VALIDATE_FIELD', event);
  }

  private async updateUIForChange(event: FieldChangeEvent): Promise<void> {
    // Placeholder for UI update logic
    debugLogger.log('REACTIVE_UPDATE_UI', event);
  }

  private async applyDiscoveryDiff(
    diff: DiscoveryDiff,
    groupId: string
  ): Promise<void> {
    // Update discovered fields for the group
    const currentFields = this.discoveredFields.get(groupId) || [];
    const newFields = [
      ...diff.unchangedFields,
      ...diff.modifiedFields,
      ...diff.addedFields
    ];

    this.discoveredFields.set(groupId, newFields);

    debugLogger.log('REACTIVE_DISCOVERY_DIFF_APPLIED', {
      groupId,
      added: diff.addedFields.length,
      removed: diff.removedFields.length,
      modified: diff.modifiedFields.length,
      unchanged: diff.unchangedFields.length
    });

    // Trigger UI update if new fields were added
    if (diff.addedFields.length > 0 && this.uiInstance && this.uiInstance.updateStaticGroupFields) {
      await this.uiInstance.updateStaticGroupFields(groupId, newFields);
    }
  }

  // Utility methods
  getMetrics() {
    return {
      fieldChanges: this.state.metrics.getCounter('field_changes'),
      errors: this.state.metrics.getCounter('field_change_errors'),
      currentPhase: this.state.phase,
      cacheSize: this.state.discoveryCache.size
    };
  }

  cleanup() {
    this.debouncer.clearAll();
    this.state.reset();
  }
}

// Incremental discovery engine
class IncrementalDiscoveryEngine {
  constructor(private runtime: ReactiveRuntimeEngine) {}

  async discoverFieldChanges(event: FieldChangeEvent): Promise<DiscoveryDiff> {
    this.runtime.state.metrics.startTimer('incremental_discovery');

    try {
      // Check cache first
      const cacheKey = this.computeCacheKey(event);
      const cached = this.runtime.state.discoveryCache.get(cacheKey);

      if (cached && this.isCacheValid(cached)) {
        this.runtime.state.metrics.increment('cache_hits');
        return this.convertToDiscoveryDiff(cached);
      }

      // Cache miss - perform discovery
      this.runtime.state.metrics.increment('cache_misses');
      const result = await this.performIncrementalDiscovery(event);

      // Cache the result
      this.runtime.state.discoveryCache.set(cacheKey, {
        fields: result.addedFields.concat(result.modifiedFields),
        fromCache: false,
        computeTimeMs: this.runtime.state.metrics.endTimer('incremental_discovery'),
        cacheKey
      });

      return result;

    } finally {
      this.runtime.state.metrics.endTimer('incremental_discovery');
    }
  }

  private computeCacheKey(event: FieldChangeEvent): string {
    // Create cache key based on group, field, and value
    return `${event.groupId}:${event.fieldId}:${JSON.stringify(event.newValue)}`;
  }

  private isCacheValid(cached: DiscoveryResult): boolean {
    // Simple time-based cache validation
    // In production, this would be more sophisticated
    return true;
  }

  private convertToDiscoveryDiff(cached: DiscoveryResult): DiscoveryDiff {
    // Convert cached result to discovery diff
    // This is simplified - in production would compare against current state
    return {
      addedFields: cached.fields,
      removedFields: [],
      modifiedFields: [],
      unchangedFields: []
    };
  }

  private async performIncrementalDiscovery(event: FieldChangeEvent): Promise<DiscoveryDiff> {
    // Get the group body function
    const groupBody = this.runtime.staticGroupBodies.get(event.groupId);
    if (!groupBody) {
      return this.emptyDiff();
    }

    // Create isolated context for discovery
    const isolatedAnswers = { ...this.runtime.answers };
    isolatedAnswers[event.fieldId] = event.newValue;

    // Store original state
    const originalAnswers = this.runtime.answers;
    const originalDiscoveredFields = new Map(this.runtime.discoveredFields);

    try {
      // Set up discovery context
      this.runtime.answers = isolatedAnswers;
      this.runtime.discoveredFields.set(event.groupId, []);

      // Run discovery with new field value
      const groupStack = [...this.runtime.groupStack];
      this.runtime.groupStack = [...groupStack, event.groupId];

      // Execute group body in discovery mode
      const isDiscoveryMode = true; // Would need to be properly managed
      await groupBody();

      // Get newly discovered fields
      const newFields = this.runtime.discoveredFields.get(event.groupId) || [];
      const oldFields = originalDiscoveredFields.get(event.groupId) || [];

      // Compute diff
      return this.computeFieldDiff(oldFields, newFields);

    } finally {
      // Restore original state
      this.runtime.answers = originalAnswers;
      this.runtime.discoveredFields = originalDiscoveredFields;
    }
  }

  private computeFieldDiff(
    oldFields: FieldMetadata[],
    newFields: FieldMetadata[]
  ): DiscoveryDiff {
    const oldFieldMap = new Map(oldFields.map(f => [f.id, f]));
    const newFieldMap = new Map(newFields.map(f => [f.id, f]));

    const addedFields = newFields.filter(f => !oldFieldMap.has(f.id));
    const removedFields = oldFields.filter(f => !newFieldMap.has(f.id));
    const unchangedFields = oldFields.filter(f => newFieldMap.has(f.id));
    const modifiedFields: FieldMetadata[] = []; // Simplified

    return {
      addedFields,
      removedFields,
      modifiedFields,
      unchangedFields
    };
  }

  private emptyDiff(): DiscoveryDiff {
    return {
      addedFields: [],
      removedFields: [],
      modifiedFields: [],
      unchangedFields: []
    };
  }
}

export { FieldChangeDebouncer, ReactiveMetrics };