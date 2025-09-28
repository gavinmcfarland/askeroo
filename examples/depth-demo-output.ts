#!/usr/bin/env node

// Demo to show what the depth tracking output would look like
// This simulates the labels that would appear with depth indicators

console.log("🧪 **Nested Conditionals Test** - Expected vs Actual Depth Output");
console.log("");

// Simulate what the labels would look like with depth tracking
const mockLabels = [
  { label: "What type of project?", expected: 0, note: "Top-level field" },
  { label: "Choose web framework:", expected: 1, note: "Inside projectType === 'web'" },
  { label: "React version:", expected: 2, note: "Inside framework === 'react'" },
  { label: "Enter experimental features to enable:", expected: 3, note: "Inside reactVersion === '19'" },
  { label: "Enable React Server Components?", expected: 3, note: "Still at depth 3 (same conditional level)" },
  { label: "Server components entry point:", expected: 4, note: "Inside enableServerComponents === true" },
  { label: "Vue version:", expected: 2, note: "Alternative branch: framework === 'vue'" },
  { label: "Use Composition API?", expected: 3, note: "Inside vueVersion === '3'" },
  { label: "Choose mobile framework:", expected: 1, note: "Alternative branch: projectType === 'mobile'" },
  { label: "React Native version:", expected: 2, note: "Inside framework === 'react-native'" },
  { label: "Target platforms:", expected: 2, note: "Same conditional level" },
  { label: "Cross-platform configuration file:", expected: 3, note: "Inside logical AND condition" },
  { label: "Enable iOS-specific optimizations?", expected: 3, note: "Inside logical OR condition" },
  { label: "Use TypeScript?", expected: 0, note: "Back to top level" },
  { label: "TypeScript configuration:", expected: 1, note: "Inside useTypeScript === true" },
  { label: "Custom tsconfig.json path:", expected: 2, note: "Inside tsConfig === 'custom'" },
  { label: "Enable strict null checks for React components?", expected: 2, note: "Complex multi-variable conditional" },
  { label: "Build tool for web:", expected: 1, note: "Ternary operator conditional" },
  { label: "Web-specific config:", expected: 1, note: "Switch-like if-else structure" },
  { label: "Mobile-specific config:", expected: 1, note: "Switch-like if-else structure" },
  { label: "Desktop-specific config:", expected: 1, note: "Switch-like if-else structure" },
];

console.log("📋 **Expected Depth Indicators:**");
console.log("");

mockLabels.forEach(({ label, expected, note }) => {
  const depthIndicator = expected > 0 ? ` [depth:${expected}]` : "";
  const paddedLabel = label.padEnd(50, ' ');
  console.log(`  ${paddedLabel}${depthIndicator}`);
  console.log(`    ${note}`);
  console.log("");
});

console.log("🎯 **Summary:**");
console.log("- Fields at depth 0: No depth indicator (top-level)");
console.log("- Fields at depth 1: [depth:1] (inside one conditional)");
console.log("- Fields at depth 2: [depth:2] (nested inside two conditionals)");
console.log("- Fields at depth 3: [depth:3] (nested inside three conditionals)");
console.log("- Fields at depth 4: [depth:4] (nested inside four conditionals)");
console.log("");
console.log("✅ This is what the actual interactive UI should display when depth tracking is working correctly!");