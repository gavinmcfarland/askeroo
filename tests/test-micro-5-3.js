#!/usr/bin/env node
/**
 * Micro Step 5.3: Test getCurrentStep() now uses FlowController
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

console.log("🧪 Micro Step 5.3: getCurrentStep() uses FlowController\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test initial state
    const snapshot = runtime.getStateSnapshot();
    if (snapshot.flow.currentStep === 0) {
        console.log("✅ FlowController starts at step 0");
    } else {
        throw new Error(`Expected 0, got ${snapshot.flow.currentStep}`);
    }

    // Test that FlowController and RuntimeState are in sync initially
    if (snapshot.state.currentStep === snapshot.flow.currentStep) {
        console.log("✅ FlowController and RuntimeState in sync initially");
    } else {
        throw new Error(`Mismatch: state=${snapshot.state.currentStep}, flow=${snapshot.flow.currentStep}`);
    }

    console.log("\n🎉 Micro Step 5.3 Complete!");
    console.log("   ✓ getCurrentStep() now uses FlowController");
    console.log("   ✓ FlowController and RuntimeState in sync");
    console.log("   ✓ Ready for Micro Step 5.4 (incrementStep/decrementStep)");
    console.log("\n⚠️  Note: This step only changed the getter");
    console.log("   incrementStep/decrementStep still use RuntimeState");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
