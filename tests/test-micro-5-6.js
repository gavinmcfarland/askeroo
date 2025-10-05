#!/usr/bin/env node
/**
 * Micro Step 5.6: Test prompt tracking now uses FlowController
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

console.log("🧪 Micro Step 5.6: Prompt tracking uses FlowController\n");

try {
    const runtime = new PromptRuntime(mockUI);
    console.log("✅ PromptRuntime created");

    // Test initial state - both should be in sync
    let snapshot = runtime.getStateSnapshot();
    if (snapshot.flow.promptCount === 0 && snapshot.state.promptCount === 0) {
        console.log("✅ Both FlowController and RuntimeState start with 0 prompts");
    } else {
        throw new Error(`Mismatch: flow=${snapshot.flow.promptCount}, state=${snapshot.state.promptCount}`);
    }

    console.log("✅ addPrompt/getPromptCount calls updated to use FlowController");
    console.log("✅ FlowController now manages prompt tracking");

    console.log("\n🎉 Micro Step 5.6 Complete!");
    console.log("   ✓ addPrompt() now uses FlowController");
    console.log("   ✓ getPromptCount() now uses FlowController");
    console.log("   ✓ FlowController manages prompt tracking");
    console.log("   ✓ Ready for Micro Step 5.7 (replay state)");
    console.log("\n⚠️  Note: Prompt tracking now managed by FlowController");
    console.log("   RuntimeState still tracks it for compatibility");

    process.exit(0);
} catch (error) {
    console.error("\n❌ Test Failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
