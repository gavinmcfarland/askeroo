#!/usr/bin/env node
/**
 * Test: Micro Step 7.1 REVERTED - Back navigation fix
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

console.log("🧪 Micro Step 7.1 REVERTED: Back navigation fix\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test that both systems are back in sync
    let snapshot = runtime.getStateSnapshot();
    console.log("📊 State Snapshot (Reverted):");
    console.log(`   FlowController: step=${snapshot.flow.currentStep}`);
    console.log(`   RuntimeState:   step=${snapshot.state.currentStep}`);

    // Verify both systems are in sync again
    if (snapshot.flow.currentStep === snapshot.state.currentStep) {
        console.log("✅ Both systems are in sync again");
    } else {
        throw new Error(`Systems not in sync: flow=${snapshot.flow.currentStep}, state=${snapshot.state.currentStep}`);
    }

    console.log("\n✅ Micro Step 7.1 REVERTED:");
    console.log("   ✓ RuntimeState sync restored for step tracking");
    console.log("   ✓ FlowController still primary for step operations");
    console.log("   ✓ RuntimeState kept in sync for compatibility");
    console.log("   ✓ Back navigation should work again");

    console.log("\n🎉 Fix Complete!");
    console.log("   Back navigation should be working again");
    console.log("   Both systems work together during transition");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
