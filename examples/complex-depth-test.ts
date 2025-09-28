#!/usr/bin/env node

// Test that more closely mimics the complex nested conditionals scenario
import { ask, radio, text, confirm, multi } from "../src/index.js";

const complexDepthTest = async () => {
  console.log("🔍 Testing complex depth scenarios...");

  // Simulate the exact structure from nested-conditionals-test.ts
  // but in a more manageable way

  // Top-level field (depth 0)
  const projectType = await radio({
    label: "What type of project?",
    shortLabel: "Project Type",
    options: [
      { value: "web", label: "Web Application" },
      { value: "mobile", label: "Mobile App" },
    ],
  });

  // Add many dummy variables to increase complexity like the real test
  const dummy1 = "test", dummy2 = "test", dummy3 = "test";
  let framework;

  if (projectType === "web") {
    // First conditional level (depth 1)
    framework = await radio({
      label: "Choose web framework:",
      shortLabel: "Web Framework",
      options: [
        { value: "react", label: "React" },
        { value: "vue", label: "Vue" },
      ],
    });

    if (framework === "vue") {
      // Second conditional level (depth 2)
      const vueVersion = await radio({
        label: "Vue version:",
        shortLabel: "Vue Version",
        options: [
          { value: "2", label: "Vue 2" },
          { value: "3", label: "Vue 3" },
        ],
      });

      if (vueVersion === "3") {
        // Third conditional level (depth 3) - this is the critical test
        const useCompositionAPI = await confirm({
          label: "Use Composition API?",
          shortLabel: "Composition API",
          initialValue: true,
        });

        console.log("Composition API result:", useCompositionAPI);
      }
    }
  }

  // Add some more complexity to mimic the real test
  const useTypeScript = await confirm({
    label: "Use TypeScript?",
    shortLabel: "TypeScript",
    initialValue: true,
  });

  if (useTypeScript) {
    const tsConfig = await radio({
      label: "TypeScript configuration:",
      shortLabel: "TS Config",
      options: [
        { value: "strict", label: "Strict mode" },
        { value: "loose", label: "Loose mode" },
      ],
    });
    console.log("TS config:", tsConfig);
  }

  return { projectType, framework, useTypeScript };
};

(async () => {
  try {
    console.log("🧪 Testing complex depth scenarios");
    const result = await ask(complexDepthTest);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();