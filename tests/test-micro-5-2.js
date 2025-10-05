#!/usr/bin/env node
/**
 * Micro Step 5.2: Verify FlowController is integrated into PromptRuntime
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

console.log("🧪 Micro Step 5.2: FlowController Integration\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created with FlowController");

    const snapshot = runtime.getStateSnapshot();

    if (snapshot.flow) {
        console.log("✅ FlowController present in snapshot");
    } else {
        throw new Error("FlowController not in snapshot");
    }

    if (typeof snapshot.flow.currentStep === "number") {
        console.log("✅ FlowController.currentStep accessible");
    } else {
        throw new Error("currentStep not accessible");
    }

    if (snapshot.flow.currentStep === 0) {
        console.log("✅ FlowController initialized correctly");
    } else {
        throw new Error(`Expected step 0, got ${snapshot.flow.currentStep}`);
    }

    console.log("\n🎉 Micro Step 5.2 Complete!");
    console.log("   ✓ FlowController added to PromptRuntime");
    console.log("   ✓ FlowController included in snapshot");
    console.log("   ✓ Not being used yet (still using RuntimeState)");
    console.log("   ✓ Ready for Micro Step 5.3");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
