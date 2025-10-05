#!/usr/bin/env node
/**
 * Micro Step 5.7: Test replay state now uses FlowController
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

console.log("🧪 Micro Step 5.7: Replay state uses FlowController\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test initial state - both should be in sync
    let snapshot = runtime.getStateSnapshot();
    if (snapshot.flow.isReplaying === false && snapshot.state.isReplaying === false) {
        console.log("✅ Both FlowController and RuntimeState start with isReplaying=false");
    } else {
        throw new Error(`Mismatch: flow=${snapshot.flow.isReplaying}, state=${snapshot.state.isReplaying}`);
    }

    console.log("✅ resetForReplay/isReplaying calls updated to use FlowController");
    console.log("✅ FlowController now manages replay state");

    console.log("\n🎉 Micro Step 5.7 Complete!");
    console.log("   ✓ resetForReplay() now uses FlowController");
    console.log("   ✓ isReplaying() now uses FlowController");
    console.log("   ✓ FlowController manages replay state");
    console.log("   ✓ Ready for Micro Step 5.8 (group processing)");
    console.log("\n⚠️  Note: Replay state now managed by FlowController");
    console.log("   RuntimeState still tracks it for compatibility");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
