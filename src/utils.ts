// Navigation utilities
export function shouldNavigateToGroup(
  currentGroup: string | undefined,
  targetGroup: string | undefined,
  currentFieldIndex: number
): boolean {
  // If we're in a group and on the first field, navigate to previous group
  return !!(currentGroup && currentFieldIndex === 0 && targetGroup !== currentGroup);
}

export function shouldNavigateWithinGroup(
  currentGroup: string | undefined,
  targetGroup: string | undefined,
  currentFieldIndex: number
): boolean {
  // If we're in a group and not on the first field, navigate within group
  return !!(currentGroup && currentFieldIndex > 0 && targetGroup === currentGroup);
}

// Validation utilities
export function validateEmail(email: string): boolean | string {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address';
  }
  return true;
}

export function validateRequired(value: string): boolean | string {
  if (!value.trim()) {
    return 'This field is required';
  }
  return true;
}

export function validateMinLength(minLength: number) {
  return (value: string): boolean | string => {
    if (value.length < minLength) {
      return `Must be at least ${minLength} characters`;
    }
    return true;
  };
}

// Flow utilities
export function createFieldKey(prefix: string = 'field'): string {
  return `${prefix}_${Date.now()}_${Math.random()}`;
}

export function createGroupKey(prefix: string = 'group'): string {
  return `${prefix}_${Date.now()}_${Math.random()}`;
}