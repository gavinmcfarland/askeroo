#!/usr/bin/env node
/**
 * Test FlowController class in isolation
 */

import { FlowController } from "../dist/src/core/FlowController.js";

console.log("🧪 Testing FlowController\n");

try {
    const flow = new FlowController();
    console.log("✅ FlowController created");

    // Test initial state
    if (flow.getCurrentStep() === 0) {
        console.log("✅ Initial step is 0");
    } else {
        throw new Error(`Expected 0, got ${flow.getCurrentStep()}`);
    }

    if (!flow.isAsking()) {
        console.log("✅ Not asking initially");
    } else {
        throw new Error("Should not be asking initially");
    }

    if (!flow.isReplaying()) {
        console.log("✅ Not replaying initially");
    } else {
        throw new Error("Should not be replaying initially");
    }

    // Test step tracking
    flow.incrementStep();
    if (flow.getCurrentStep() === 1) {
        console.log("✅ Step incremented to 1");
    } else {
        throw new Error(`Expected 1, got ${flow.getCurrentStep()}`);
    }

    if (flow.isReplaying()) {
        console.log("✅ Is replaying when step > 0");
    } else {
        throw new Error("Should be replaying when step > 0");
    }

    flow.decrementStep();
    if (flow.getCurrentStep() === 0) {
        console.log("✅ Step decremented to 0");
    } else {
        throw new Error(`Expected 0, got ${flow.getCurrentStep()}`);
    }

    // Test asking state
    flow.setAsking(true);
    if (flow.isAsking()) {
        console.log("✅ Asking state set to true");
    } else {
        throw new Error("Should be asking");
    }

    flow.setAsking(false);
    if (!flow.isAsking()) {
        console.log("✅ Asking state set to false");
    } else {
        throw new Error("Should not be asking");
    }

    // Test prompt tracking
    flow.addPrompt("prompt-1");
    flow.addPrompt("prompt-2");
    if (flow.getPromptCount() === 2) {
        console.log("✅ Prompt count is 2");
    } else {
        throw new Error(`Expected 2, got ${flow.getPromptCount()}`);
    }

    const prompts = flow.getPrompts();
    if (prompts.length === 2 && prompts[0] === "prompt-1" && prompts[1] === "prompt-2") {
        console.log("✅ Prompts tracked correctly");
    } else {
        throw new Error(`Expected ["prompt-1", "prompt-2"], got ${JSON.stringify(prompts)}`);
    }

    // Test group processing
    flow.markGroupAsProcessed("group-1");
    if (flow.isGroupProcessed("group-1")) {
        console.log("✅ Group marked as processed");
    } else {
        throw new Error("Group should be processed");
    }

    if (!flow.isGroupProcessed("group-2")) {
        console.log("✅ Unprocessed group returns false");
    } else {
        throw new Error("Group-2 should not be processed");
    }

    // Test reset for replay
    flow.resetForReplay();
    if (flow.getPromptCount() === 0) {
        console.log("✅ Prompts cleared after resetForReplay");
    } else {
        throw new Error("Prompts should be cleared");
    }

    if (!flow.isGroupProcessed("group-1")) {
        console.log("✅ Processed groups cleared after resetForReplay");
    } else {
        throw new Error("Processed groups should be cleared");
    }

    // Test snapshot
    const snapshot = flow.getSnapshot();
    if (snapshot && typeof snapshot.currentStep === "number") {
        console.log("✅ Snapshot returns valid data");
    } else {
        throw new Error("Snapshot should return valid data");
    }

    console.log("\n🎉 FlowController test passed!");
    console.log("   ✓ All methods work correctly");
    console.log("   ✓ Ready to integrate into PromptRuntime");

    process.exit(0);
} catch (error) {
    console.error("\n❌ FlowController test failed:");
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
