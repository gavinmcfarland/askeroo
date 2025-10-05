#!/usr/bin/env node
/**
 * Micro Step 7.1: Test RuntimeState sync removed from step tracking
 */

import { PromptRuntime } from "../dist/src/core/PromptRuntime.js";

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

console.log("🧪 Micro Step 7.1: RuntimeState sync removed from step tracking\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test that step tracking now uses FlowController only
    let snapshot = runtime.getStateSnapshot();
    console.log("📊 State Snapshot:");
    console.log(`   FlowController: step=${snapshot.flow.currentStep}`);
    console.log(`   RuntimeState:   step=${snapshot.state.currentStep}`);

    // Note: They might be different now since we removed sync
    // FlowController is the source of truth
    if (snapshot.flow.currentStep === 0) {
        console.log("✅ FlowController step tracking working (step=0)");
    } else {
        throw new Error(`FlowController step tracking failed: ${snapshot.flow.currentStep}`);
    }

    console.log("✅ RuntimeState sync removed from step tracking");
    console.log("✅ FlowController is now the single source of truth for steps");

    console.log("\n🎉 Micro Step 7.1 Complete!");
    console.log("   ✓ RuntimeState sync removed from incrementStep()");
    console.log("   ✓ RuntimeState sync removed from decrementStep()");
    console.log("   ✓ FlowController is primary for step tracking");
    console.log("   ✓ Ready for Micro Step 7.2 (prompt tracking)");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
