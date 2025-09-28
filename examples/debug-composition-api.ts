#!/usr/bin/env node

// Test specifically for the "Use Composition API?" depth issue
import { ask, radio, confirm } from "../src/index.js";

const testCompositionAPI = async () => {
  console.log("🔍 Testing Use Composition API field depth...");

  // Mimic the exact structure from nested conditionals test
  const projectType = "web";
  const framework = "vue";
  const vueVersion = "3";

  if (projectType === "web") {
    console.log("Inside web conditional");

    if (framework === "vue") {
      console.log("Inside vue conditional");

      if (vueVersion === "3") {
        console.log("Inside vue 3 conditional - about to call Use Composition API");

        // This should be depth 3
        const useCompositionAPI = await confirm({
          label: "Use Composition API?",
          shortLabel: "Composition API",
          initialValue: true,
        });

        console.log("Use Composition API result:", useCompositionAPI);
        return { projectType, framework, vueVersion, useCompositionAPI };
      }
    }
  }

  return { projectType, framework, vueVersion };
};

(async () => {
  try {
    console.log("🧪 Testing Use Composition API depth detection");
    const result = await ask(testCompositionAPI);
    console.log("✅ Test complete:", result);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
})();