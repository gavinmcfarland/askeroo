export interface FieldConfig {
  message: string;
}

export interface TextFieldConfig extends FieldConfig {
  placeholder?: string;
  validate?: (value: string) => boolean | string;
}

export interface ConfirmFieldConfig extends FieldConfig {
  initial?: boolean;
}

export interface GroupConfig {
  message: string;
}

export interface HistoryEntry {
  type: 'field' | 'group';
  key: string;
  value?: any;
  groupKey?: string;
  fieldIndex?: number;
}

export interface FlowState {
  history: HistoryEntry[];
  currentGroup?: string;
  currentFieldIndex: number;
  values: Record<string, any>;
  groupValues: Record<string, Record<string, any>>;
}

export type FieldFunction<T = any> = (config: any) => Promise<T>;
export type GroupFunction<T = any> = (config: GroupConfig, fn: () => Promise<T>) => Promise<T>;
export type FlowFunction<T = any> = () => Promise<T>;