// Validation function type - return string for error, null for valid
export type ValidatorFunction<T = any> = (value: T) => string | null | Promise<string | null>;