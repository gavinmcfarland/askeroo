# Reactive Discovery Architecture Proposal

## Executive Summary

This proposal outlines a comprehensive approach to implement **Reactive Discovery** for static flows, enabling true progressive field revelation where conditional fields appear dynamically as conditions are met, rather than being pre-discovered upfront.

## Core Architecture

### 1. State Machine-Based Runtime

Replace the current linear execution model with a state machine that can pause, re-discover, and resume:

```typescript
enum RuntimeState {
  DISCOVERY = 'discovery',
  EXECUTION = 'execution',
  RE_DISCOVERY = 're_discovery',
  SUSPENDED = 'suspended',
  ERROR = 'error'
}

interface ReactiveRuntime {
  state: RuntimeState;
  executionCheckpoint: ExecutionCheckpoint;
  discoveryCache: Map<string, DiscoveryResult>;
  fieldChangeSubscriptions: Map<string, FieldChangeHandler[]>;
}

interface ExecutionCheckpoint {
  currentStep: number;
  interactivePrompts: string[];
  answers: Record<string, unknown>;
  groupStack: string[];
  fieldSequence: FieldMetadata[];
}
```

### 2. Event-Driven Field Change System

Implement a subscription system for field value changes that can trigger re-discovery:

```typescript
interface FieldChangeEvent {
  fieldId: string;
  oldValue: unknown;
  newValue: unknown;
  groupId: string;
  timestamp: number;
}

interface FieldChangeHandler {
  condition: (event: FieldChangeEvent) => boolean;
  action: 'rediscover' | 'validate' | 'update_ui';
  debounceMs?: number;
  priority: number;
}

class ReactiveDiscoveryEngine {
  async onFieldValueChange(event: FieldChangeEvent) {
    // 1. Debounce rapid changes
    await this.debounceFieldChanges(event);

    // 2. Check if change affects conditional fields
    const affectedHandlers = this.getAffectedHandlers(event);

    // 3. Execute handlers by priority
    for (const handler of affectedHandlers) {
      await this.executeChangeHandler(handler, event);
    }
  }
}
```

### 3. Incremental Discovery Algorithm

Smart discovery that only explores changes, not the entire group:

```typescript
interface DiscoveryDiff {
  addedFields: FieldMetadata[];
  removedFields: FieldMetadata[];
  modifiedFields: FieldMetadata[];
  unchangedFields: FieldMetadata[];
}

class IncrementalDiscovery {
  async discoverFieldChanges(
    groupId: string,
    changedField: string,
    newValue: unknown
  ): Promise<DiscoveryDiff> {

    // 1. Create isolated execution context
    const isolatedContext = this.createIsolatedContext(groupId);

    // 2. Apply the field change
    isolatedContext.answers[changedField] = newValue;

    // 3. Run discovery only on affected branches
    const newFields = await this.discoverAffectedBranches(isolatedContext);

    // 4. Compare with current field set
    return this.computeDiff(this.currentFields, newFields);
  }

  private async discoverAffectedBranches(context: IsolatedContext) {
    // Smart discovery: only re-run code paths that could be affected
    const affectedBranches = this.analyzeCodePaths(context);
    const discoveredFields: FieldMetadata[] = [];

    for (const branch of affectedBranches) {
      const branchFields = await this.runBranchDiscovery(branch, context);
      discoveredFields.push(...branchFields);
    }

    return discoveredFields;
  }
}
```

## Implementation Phases

### Phase 1: Foundation (4-6 weeks)
- [ ] Implement state machine runtime
- [ ] Create field change event system
- [ ] Build execution checkpointing
- [ ] Add debouncing and batching
- [ ] Comprehensive test suite for state transitions

### Phase 2: Discovery Engine (3-4 weeks)
- [ ] Implement incremental discovery algorithm
- [ ] Create isolated execution contexts
- [ ] Build branch analysis system
- [ ] Add discovery result caching
- [ ] Performance profiling and optimization

### Phase 3: UI Integration (3-4 weeks)
- [ ] Create reactive UI components
- [ ] Implement smooth field transitions
- [ ] Add loading states and skeleton UI
- [ ] Handle focus management during updates
- [ ] Error boundaries and fallback states

### Phase 4: Advanced Features (2-3 weeks)
- [ ] Field dependency tracking
- [ ] Undo/redo for field changes
- [ ] Real-time collaboration support
- [ ] Advanced caching strategies
- [ ] Performance monitoring

### Phase 5: Migration & Polish (2-3 weeks)
- [ ] Backward compatibility layer
- [ ] Migration tooling
- [ ] Documentation and examples
- [ ] Performance benchmarks
- [ ] Production deployment

## Technical Challenges & Solutions

### Challenge 1: Race Conditions
**Problem**: User types faster than re-discovery can complete

**Solution**:
```typescript
class ChangeBuffer {
  private pendingChanges = new Map<string, FieldChangeEvent>();
  private processing = false;

  async bufferChange(event: FieldChangeEvent) {
    // Cancel previous discovery for same field
    this.cancelPendingDiscovery(event.fieldId);

    // Buffer the latest change
    this.pendingChanges.set(event.fieldId, event);

    // Process batched changes
    if (!this.processing) {
      this.processing = true;
      await this.processBatchedChanges();
      this.processing = false;
    }
  }
}
```

### Challenge 2: UI State Consistency
**Problem**: UI and runtime state can become inconsistent during updates

**Solution**: Atomic updates with rollback capability
```typescript
class AtomicUIUpdate {
  async applyFieldChanges(diff: DiscoveryDiff): Promise<void> {
    const transaction = new UITransaction();

    try {
      // Prepare all changes
      await transaction.prepare(diff);

      // Apply atomically
      await transaction.commit();

    } catch (error) {
      // Rollback on failure
      await transaction.rollback();
      throw error;
    }
  }
}
```

### Challenge 3: Performance Impact
**Problem**: Frequent re-discovery could slow down the UI

**Solution**: Multi-level caching and optimization
```typescript
class DiscoveryCache {
  // Level 1: Field-level cache
  fieldResultCache = new Map<string, FieldDiscoveryResult>();

  // Level 2: Branch-level cache
  branchCache = new Map<string, BranchDiscoveryResult>();

  // Level 3: Full group cache
  groupCache = new Map<string, GroupDiscoveryResult>();

  async getCachedResult(context: DiscoveryContext): Promise<DiscoveryResult> {
    const cacheKey = this.computeCacheKey(context);

    // Check caches in order of specificity
    return this.fieldResultCache.get(cacheKey) ||
           this.branchCache.get(cacheKey) ||
           this.groupCache.get(cacheKey) ||
           await this.computeAndCache(context);
  }
}
```

## API Changes

### New Runtime Configuration

```typescript
interface ReactiveRuntimeConfig {
  discovery: {
    mode: 'upfront' | 'reactive' | 'hybrid';
    debounceMs: number;
    maxConcurrentDiscoveries: number;
    cacheStrategy: 'memory' | 'persistent' | 'distributed';
  };
  ui: {
    enableTransitions: boolean;
    transitionDuration: number;
    showLoadingStates: boolean;
    preserveFocusDuringUpdates: boolean;
  };
}

const runtime = createRuntime(ui, {
  discovery: {
    mode: 'reactive',
    debounceMs: 300,
    maxConcurrentDiscoveries: 2,
    cacheStrategy: 'memory'
  }
});
```

### Enhanced Group Definition

```typescript
interface ReactiveGroupOptions extends GroupOpts {
  discovery: {
    triggers?: string[]; // Field IDs that trigger re-discovery
    strategy?: 'incremental' | 'full';
    priority?: number;
  };
  ui: {
    transitionMode?: 'slide' | 'fade' | 'none';
    showFieldCount?: boolean;
    groupLoadingState?: React.ComponentType;
  };
}

const userPrefs = await group(
  {
    message: "User Preferences",
    flow: "static",
    discovery: {
      triggers: ['role', 'subscription_type'],
      strategy: 'incremental'
    }
  },
  async () => { /* group body */ }
);
```

## Performance Analysis

### Benchmarks & Targets

| Metric | Current (Upfront) | Target (Reactive) | Notes |
|--------|------------------|-------------------|--------|
| Initial Load Time | 150ms | 80ms | Faster initial render |
| Field Discovery Time | 0ms | <100ms | Per field change |
| Memory Usage | 2MB | 3MB | +50% for caching |
| UI Update Latency | N/A | <50ms | Field appearance delay |
| Cache Hit Rate | N/A | >80% | Discovery cache effectiveness |

### Optimization Strategies

1. **Smart Caching**: Cache discovery results at multiple levels
2. **Lazy Evaluation**: Only discover fields when conditions are met
3. **Batch Processing**: Group multiple field changes together
4. **Web Workers**: Offload discovery computation to background threads
5. **Virtualization**: Only render visible fields in large forms

## Migration Strategy

### Backward Compatibility

```typescript
// Existing code continues to work
const result = await ask(async ({ group, text }) => {
  const prefs = await group(
    { message: "Preferences", flow: "static" }, // <- No changes needed
    async () => {
      const role = await text({ message: "Role" });
      if (role === "admin") {
        const code = await text({ message: "Access code" });
        return { role, code };
      }
      return { role };
    }
  );
  return prefs;
});
```

### Opt-in Enhancement

```typescript
// Enhanced reactive version
const result = await ask(async ({ group, text }) => {
  const prefs = await group(
    {
      message: "Preferences",
      flow: "static",
      discovery: { mode: 'reactive' } // <- Opt-in
    },
    async () => {
      const role = await text({ message: "Role" });
      if (role === "admin") {
        const code = await text({ message: "Access code" });
        return { role, code };
      }
      return { role };
    }
  );
  return prefs;
});
```

## User Experience Benefits

### Progressive Revelation
- Fields appear smoothly as conditions are met
- No overwhelming "wall of fields" initially
- More intuitive and responsive feeling

### Smart Loading States
```typescript
// Built-in loading states for discovery
const LoadingField = () => (
  <div className="field-loading">
    <Skeleton height={40} />
    <span>Loading additional fields...</span>
  </div>
);
```

### Transition Animations
- Smooth slide-in animations for new fields
- Fade-out for removed fields
- Maintained focus and scroll position

## Risk Assessment

### High Risk Items
1. **Complexity**: Significantly more complex than current implementation
2. **Debugging**: Harder to debug state machine transitions
3. **Performance**: Potential for UI lag during discovery
4. **Edge Cases**: Many more failure modes to handle

### Mitigation Strategies
1. **Phased Rollout**: Gradual deployment with feature flags
2. **Comprehensive Testing**: Extensive unit, integration, and E2E tests
3. **Monitoring**: Real-time performance and error monitoring
4. **Fallback Mode**: Automatic fallback to upfront discovery on errors
5. **Kill Switch**: Ability to instantly disable reactive discovery

## Success Metrics

### Technical Metrics
- [ ] Discovery latency < 100ms (95th percentile)
- [ ] UI update latency < 50ms (95th percentile)
- [ ] Cache hit rate > 80%
- [ ] Error rate < 0.1%
- [ ] Memory usage increase < 50%

### User Experience Metrics
- [ ] Perceived performance improvement (user surveys)
- [ ] Reduced form abandonment rate
- [ ] Increased task completion rate
- [ ] Lower time-to-first-interaction

### Business Metrics
- [ ] Developer adoption rate > 60% within 6 months
- [ ] Reduced support tickets related to form behavior
- [ ] Positive community feedback
- [ ] No performance regressions in production

## Conclusion

Reactive Discovery represents a significant architectural evolution that would provide truly progressive field revelation. While complex to implement, the phased approach and comprehensive risk mitigation strategies make it feasible.

The proposal balances ambition with pragmatism, ensuring backward compatibility while enabling a significantly enhanced user experience for static flows.

**Recommendation**: Proceed with Phase 1 implementation to validate core architecture, with go/no-go decision points at each phase based on technical feasibility and performance benchmarks.