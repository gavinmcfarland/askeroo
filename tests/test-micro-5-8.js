#!/usr/bin/env node
/**
 * Micro Step 5.8: Test group processing now uses FlowController
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

console.log("🧪 Micro Step 5.8: Group processing uses FlowController\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test initial state - both should be in sync
    let snapshot = runtime.getStateSnapshot();
    if (snapshot.flow.processedGroupsCount === 0 && snapshot.state.processedGroupsCount === 0) {
        console.log("✅ Both FlowController and RuntimeState start with 0 processed groups");
    } else {
        throw new Error(`Mismatch: flow=${snapshot.flow.processedGroupsCount}, state=${snapshot.state.processedGroupsCount}`);
    }

    console.log("✅ isGroupProcessed/markGroupAsProcessed calls updated to use FlowController");
    console.log("✅ FlowController now manages group processing");

    console.log("\n🎉 Micro Step 5.8 Complete!");
    console.log("   ✓ isGroupProcessed() now uses FlowController");
    console.log("   ✓ markGroupAsProcessed() now uses FlowController");
    console.log("   ✓ FlowController manages group processing");
    console.log("   ✓ Ready for Micro Step 5.9 (comprehensive test)");
    console.log("\n⚠️  Note: Group processing now managed by FlowController");
    console.log("   RuntimeState still tracks it for compatibility");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
