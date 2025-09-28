#!/usr/bin/env node

// Debug script to understand why "Use TypeScript?" is showing depth 1 instead of 0
import { ask, confirm } from "../src/index.js";

const simpleFlow = async () => {
  console.log("🔍 Testing simple top-level confirm field...");

  // This should be depth 0 (top level)
  const useTypeScript = await confirm({
    label: "Use TypeScript?",
    shortLabel: "TypeScript",
    initialValue: true,
  });

  console.log("Result:", useTypeScript);
  return { useTypeScript };
};

(async () => {
  try {
    console.log("🧪 Testing isolated TypeScript field depth detection");
    const result = await ask(simpleFlow);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();