#!/usr/bin/env node

// Focused test for the "Use TypeScript?" depth issue
import { ask, confirm } from "../src/index.js";

const testTypeScriptDepth = async () => {
  console.log("🔍 Testing Use TypeScript field depth detection...");

  // Simulate some previous execution (this might affect stack trace)
  const dummy1 = "web";
  const dummy2 = "react";

  // Simulate being after conditional blocks (like in the real test)
  if (dummy1 === "web") {
    // Some nested logic
    if (dummy2 === "react") {
      console.log("Previous conditional logic executed");
    }
  }

  // This should be depth 0 (back to top level)
  console.log("About to call confirm for Use TypeScript...");
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
    console.log("🧪 Testing isolated Use TypeScript depth detection");
    const result = await ask(testTypeScriptDepth);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();