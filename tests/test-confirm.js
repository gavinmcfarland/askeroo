#!/usr/bin/env node
import { ask, confirm } from "../dist/src/index.js";

const flow = async () => {
    console.log("Testing confirm component with initial value behavior\n");

    // Test 1: No initial value (default behavior)
    const default1 = await confirm({
        label: "Do you want to continue? (no initial value)"
    });

    // Test 2: Initial value = true (should make 'Yes' the second option)
    const withTrue = await confirm({
        label: "Do you want to save? (initial value = true)",
        initialValue: true
    });

    // Test 3: Initial value = false (should make 'No' the second option)
    const withFalse = await confirm({
        label: "Are you sure? (initial value = false)",
        initialValue: false
    });

    // Test 4: Custom options with initial value (should work normally)
    const custom = await confirm({
        label: "Select an option (custom options):",
        options: [
            { value: "option1", label: "First Option" },
            { value: "option2", label: "Second Option" },
            { value: "option3", label: "Third Option" }
        ],
        initialValue: "option2"
    });

    return { default1, withTrue, withFalse, custom };
};

(async () => {
    try {
        const result = await ask(flow);
        console.log("\nResults:");
        console.log("Default (no initial):", result.default1);
        console.log("With true initial:", result.withTrue);
        console.log("With false initial:", result.withFalse);
        console.log("Custom options:", result.custom);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
})();
