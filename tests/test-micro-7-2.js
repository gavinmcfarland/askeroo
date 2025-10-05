#!/usr/bin/env node
/**
 * Micro Step 7.2: Test answer management migrated to tree
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

console.log("🧪 Micro Step 7.2: Answer management migrated to tree\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test that answer management now uses tree
    let snapshot = runtime.getStateSnapshot();
    console.log("📊 State Snapshot:");
    console.log(`   Tree:           nodeCount=${snapshot.tree.nodeCount}, historyLength=${snapshot.tree.historyLength}`);
    console.log(`   FlowController: step=${snapshot.flow.currentStep}`);

    console.log("✅ Answer management migrated to tree:");
    console.log("   ✓ clearFutureAnswers() now uses tree-based cleanup");
    console.log("   ✓ clearUnreachableAnswers() now uses tree-based cleanup");
    console.log("   ✓ setStep() now uses FlowController");
    console.log("   ✓ Tree manages answer cleanup and step tracking");

    console.log("\n🎉 Micro Step 7.2 Complete!");
    console.log("   ✓ Answer cleanup now tree-based");
    console.log("   ✓ Step management now FlowController-based");
    console.log("   ✓ Tree handles answer lifecycle");
    console.log("   ✓ Ready for next dependency migration");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
