// Simple runtime-based depth tracking that doesn't rely on line numbers
let callStack: Array<{ type: string; depth: number }> = [];

export function trackPluginCall(pluginType: string): number {
  // Analyze the current call stack to determine depth
  const error = new Error();
  const stack = error.stack?.split('\n') || [];

  // Count the number of conditional constructs in the stack
  let depth = 0;

  // Look for indicators of conditional execution in the stack frames
  for (const frame of stack) {
    // This is a simple heuristic - could be improved
    if (frame.includes('if') || frame.includes('switch') || frame.includes('?')) {
      depth++;
    }
  }

  // For demo purposes, let's use a simple pattern:
  // - Look at the call stack depth relative to the user function
  // - Use a simple heuristic based on function nesting

  // Find the user function frame
  let userFrameIndex = -1;
  for (let i = 0; i < stack.length; i++) {
    if (stack[i].includes('testDepth') || stack[i].includes('plugma') || stack[i].includes('flow')) {
      userFrameIndex = i;
      break;
    }
  }

  if (userFrameIndex === -1) return 0;

  // Simple approach: count additional frames beyond the first user call
  // This is a rough approximation of conditional nesting
  const baseFrames = 8; // Typical number of framework frames
  const extraFrames = Math.max(0, stack.length - baseFrames - userFrameIndex);

  console.log(`📊 Simple depth calculation for ${pluginType}:`);
  console.log(`  - Total frames: ${stack.length}`);
  console.log(`  - User frame at: ${userFrameIndex}`);
  console.log(`  - Extra frames: ${extraFrames}`);
  console.log(`  - Calculated depth: ${Math.min(extraFrames, 3)}`); // Cap at 3 for safety

  return Math.min(extraFrames, 3);
}

// Manual depth tracking for testing
let manualDepth = 0;

export function enterConditional() {
  manualDepth++;
  console.log(`🔽 Entering conditional, depth now: ${manualDepth}`);
}

export function exitConditional() {
  manualDepth = Math.max(0, manualDepth - 1);
  console.log(`🔼 Exiting conditional, depth now: ${manualDepth}`);
}

export function getCurrentDepth(): number {
  return manualDepth;
}

export function resetDepth() {
  manualDepth = 0;
}