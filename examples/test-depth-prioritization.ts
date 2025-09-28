#!/usr/bin/env node

// Test the depth prioritization fix
import { ask, confirm, radio } from "../src/index.js";

const testDepthPrioritization = async () => {
  console.log("🔍 Testing depth prioritization logic...");

  // Create some conditional structure first
  const projectType = "web";
  if (projectType === "web") {
    // Some nested logic to populate the depth map with depth 1 entries
    console.log("Inside web conditional");
    const framework = "react";
    if (framework === "react") {
      console.log("Inside react conditional");
    }
  }

  // Now test a top-level field that should be depth 0
  // This should NOT be affected by the nearby depth 1 entries
  console.log("About to call top-level confirm...");
  const useTypeScript = await confirm({
    label: "Use TypeScript?",
    shortLabel: "TypeScript",
    initialValue: true,
  });

  console.log("Top-level field completed, result:", useTypeScript);
  return { useTypeScript };
};

(async () => {
  try {
    console.log("🧪 Testing depth prioritization logic");
    const result = await ask(testDepthPrioritization);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();