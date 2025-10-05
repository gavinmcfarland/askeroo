#!/usr/bin/env node
/**
 * FlowController Test: Verify basic functionality
 */

import { PromptRuntime } from "../dist/src/core/PromptRuntime.js";

// Create a mock UI
const mockUI = {
    async showGroup() { },
    clearGroup() { },
    cleanup() { },
    setRuntime() { },
    getTreeManager() { },
    async rediscoverStaticGroup() { },
    async completeFlow() { },
    text: async () => "test",
};

console.log("🧪 FlowController Test: Basic Functionality\n");

try {
    // Create runtime
    const runtime = new PromptRuntime(mockUI);

    console.log("✅ Runtime created with FlowController");

    // Get initial snapshot
    const snapshot = runtime.getStateSnapshot();

    // Check that flow controller is included in snapshot
    if (snapshot.flow) {
        console.log("✅ FlowController included in state snapshot");
        console.log(`   - Current step: ${snapshot.flow.currentStep}`);
        console.log(`   - Asking: ${snapshot.flow.asking}`);
        console.log(`   - Prompt count: ${snapshot.flow.promptCount}`);
        console.log(`   - Is replaying: ${snapshot.flow.isReplaying}`);
        console.log(`   - Processed groups: ${snapshot.flow.processedGroupsCount}`);
    } else {
        throw new Error("FlowController not found in state snapshot");
    }

    // Verify initial state
    if (snapshot.flow.currentStep === 0) {
        console.log("✅ Initial step is 0");
    } else {
        throw new Error(`Expected initial step 0, got ${snapshot.flow.currentStep}`);
    }

    if (snapshot.flow.asking === false) {
        console.log("✅ Initial asking state is false");
    } else {
        throw new Error(`Expected asking false, got ${snapshot.flow.asking}`);
    }

    if (snapshot.flow.promptCount === 0) {
        console.log("✅ Initial prompt count is 0");
    } else {
        throw new Error(`Expected prompt count 0, got ${snapshot.flow.promptCount}`);
    }

    console.log("\n🎉 FlowController Test Complete!");
    console.log("   ✓ FlowController created and initialized");
    console.log("   ✓ Included in state snapshot");
    console.log("   ✓ Initial state values correct");
    console.log("   ✓ Ready for next micro step");

    process.exit(0);
} catch (error) {
    console.error("\n❌ FlowController Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
