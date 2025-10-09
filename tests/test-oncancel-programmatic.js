/**
 * Test onCancel by programmatically sending SIGINT
 * This works in non-interactive environments
 */

import { createRuntime } from "../dist/src/core/core.js";
import { ui } from "../dist/src/core/ui.js";

async function testOnCancelProgrammatic() {
    console.log("Testing onCancel with programmatic SIGINT...\n");

    let callbackExecuted = false;
    let cleanupExecuted = false;

    // Mock the UI cleanup to track if it's called
    const originalCleanup = ui.cleanup;
    ui.cleanup = () => {
        cleanupExecuted = true;
        console.log("✅ UI cleanup was called");
        if (originalCleanup) originalCleanup();
    };

    // Mock process.exit to prevent actual exit during test
    const originalExit = process.exit;
    let exitCalled = false;
    let exitCode = null;
    process.exit = (code) => {
        exitCalled = true;
        exitCode = code;
        console.log(`✅ process.exit(${code}) was called`);
        // Don't actually exit, restore and finish test
        process.exit = originalExit;

        // Verify results
        setTimeout(() => {
            console.log("\n=== Test Results ===");
            if (callbackExecuted) {
                console.log("✅ onCancel callback was executed");
            } else {
                console.log("❌ onCancel callback was NOT executed");
            }
            if (cleanupExecuted) {
                console.log("✅ UI cleanup was executed");
            } else {
                console.log("❌ UI cleanup was NOT executed");
            }
            if (exitCalled && exitCode === 0) {
                console.log("✅ Process exit with code 0 was called");
            } else {
                console.log(`❌ Process exit was not called correctly (exitCode: ${exitCode})`);
            }

            const allPassed = callbackExecuted && cleanupExecuted && exitCalled && exitCode === 0;
            if (allPassed) {
                console.log("\n🎉 All tests passed!");
            } else {
                console.log("\n❌ Some tests failed");
            }

            // Clean up and exit
            ui.cleanup = originalCleanup;
            originalExit(allPassed ? 0 : 1);
        }, 100);
    };

    try {
        const runtime = createRuntime(ui);

        // Start the flow (don't await it, we'll interrupt it)
        const flowPromise = runtime.executeFlow(async ({ onCancel }) => {
            // Register a cancel callback
            onCancel(() => {
                callbackExecuted = true;
                console.log("✅ User's onCancel callback was executed");
            });

            console.log("Flow started, waiting for SIGINT...");

            // Wait indefinitely (will be interrupted by SIGINT)
            await new Promise(() => { });
        });

        // Give the flow time to start and register handlers
        setTimeout(() => {
            console.log("Sending SIGINT signal (simulating Ctrl+C)...\n");
            process.emit("SIGINT");
        }, 100);

    } catch (error) {
        console.error("\n❌ Test failed with error:", error);
        process.exit = originalExit;
        ui.cleanup = originalCleanup;
        originalExit(1);
    }
}

testOnCancelProgrammatic();

