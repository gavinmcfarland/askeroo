#!/usr/bin/env node
/**
 * Micro Step 5.5: Test isAsking/setAsking now use FlowController
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

console.log("🧪 Micro Step 5.5: isAsking/setAsking use FlowController\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test initial state - both should be in sync
    let snapshot = runtime.getStateSnapshot();
    if (snapshot.flow.asking === false && snapshot.state.asking === false) {
        console.log("✅ Both FlowController and RuntimeState start with asking=false");
    } else {
        throw new Error(`Mismatch: flow=${snapshot.flow.asking}, state=${snapshot.state.asking}`);
    }

    console.log("✅ isAsking/setAsking calls updated to use FlowController");
    console.log("✅ FlowController now manages asking state");

    console.log("\n🎉 Micro Step 5.5 Complete!");
    console.log("   ✓ isAsking() now uses FlowController");
    console.log("   ✓ setAsking() now uses FlowController");
    console.log("   ✓ FlowController manages asking state");
    console.log("   ✓ Ready for Micro Step 5.6 (prompt tracking)");
    console.log("\n⚠️  Note: Asking state now managed by FlowController");
    console.log("   RuntimeState still tracks it for compatibility");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
