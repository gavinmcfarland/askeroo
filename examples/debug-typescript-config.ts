#!/usr/bin/env node

// Test specifically for the TypeScript configuration field depth issue
import { ask, confirm, radio } from "../src/index.js";

const testTypeScriptConfig = async () => {
  console.log("🔍 Testing TypeScript configuration field depth...");

  // This mimics the structure from the nested conditionals test
  const useTypeScript = true; // Simulate user choosing Yes

  // Conditional based on earlier choices (should be depth 1)
  if (useTypeScript) {
    console.log("Inside useTypeScript conditional block");

    // This should show [depth:1]
    const tsConfig = await radio({
      label: "TypeScript configuration:",
      shortLabel: "TS Config",
      options: [
        { value: "strict", label: "Strict mode" },
        { value: "loose", label: "Loose mode" },
        { value: "custom", label: "Custom configuration" },
      ],
    });

    console.log("TypeScript config result:", tsConfig);
    return { useTypeScript, tsConfig };
  }

  return { useTypeScript };
};

(async () => {
  try {
    console.log("🧪 Testing TypeScript configuration depth detection");
    const result = await ask(testTypeScriptConfig);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();