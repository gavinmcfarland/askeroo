import type { FlowState, HistoryEntry } from './types.js';

export class FlowManager {
  private state: FlowState;
  private generator: Generator<any, any, any> | null = null;

  constructor() {
    this.state = {
      history: [],
      currentFieldIndex: 0,
      values: {},
      groupValues: {}
    };
  }

  public getState(): FlowState {
    return { ...this.state };
  }

  public addToHistory(entry: HistoryEntry): void {
    this.state.history.push(entry);
  }

  public canGoBack(): boolean {
    return this.state.history.length > 0;
  }

  public goBack(): HistoryEntry | null {
    if (!this.canGoBack()) return null;

    const lastEntry = this.state.history.pop();
    if (!lastEntry) return null;

    // Remove the value from state
    if (lastEntry.type === 'field') {
      if (lastEntry.groupKey) {
        delete this.state.groupValues[lastEntry.groupKey]?.[lastEntry.key];
      } else {
        delete this.state.values[lastEntry.key];
      }
    } else if (lastEntry.type === 'group') {
      delete this.state.groupValues[lastEntry.key];
    }

    return lastEntry;
  }

  public setValue(key: string, value: any, groupKey?: string): void {
    if (groupKey) {
      if (!this.state.groupValues[groupKey]) {
        this.state.groupValues[groupKey] = {};
      }
      this.state.groupValues[groupKey][key] = value;
    } else {
      this.state.values[key] = value;
    }
  }

  public setCurrentGroup(groupKey?: string): void {
    this.state.currentGroup = groupKey;
    this.state.currentFieldIndex = 0;
  }

  public incrementFieldIndex(): void {
    this.state.currentFieldIndex++;
  }

  public resetFieldIndex(): void {
    this.state.currentFieldIndex = 0;
  }

  public getCurrentFieldIndex(): number {
    return this.state.currentFieldIndex;
  }

  public getGroupValues(groupKey: string): Record<string, any> {
    return this.state.groupValues[groupKey] || {};
  }

  public getAllValues(): any {
    const result = { ...this.state.values };

    // Merge group values
    Object.keys(this.state.groupValues).forEach(groupKey => {
      result[groupKey] = this.state.groupValues[groupKey];
    });

    return result;
  }

  public reset(): void {
    this.state = {
      history: [],
      currentFieldIndex: 0,
      values: {},
      groupValues: {}
    };
    this.generator = null;
  }

  public setGenerator(generator: Generator<any, any, any>): void {
    this.generator = generator;
  }

  public getGenerator(): Generator<any, any, any> | null {
    return this.generator;
  }
}