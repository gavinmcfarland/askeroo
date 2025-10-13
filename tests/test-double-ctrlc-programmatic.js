/**
 * Programmatic test for double Ctrl+C force quit behavior
 *
 * This test programmatically simulates pressing Ctrl+C twice
 * and verifies the expected behavior.
 */

const { ask, text } = require("../dist/index.js");

async function testDoubleCtrlCProgrammatic() {
    console.log("Testing double Ctrl+C force quit (programmatic)...\n");

    let cancelCallbackCalled = false;
    let processExitCalled = false;
    let exitCode = null;

    // Mock process.exit to capture the call
    const originalExit = process.exit;
    process.exit = (code) => {
        processExitCalled = true;
        exitCode = code;
        console.log(`\n✓ process.exit(${code}) called`);

        // Restore original and actually exit
        process.exit = originalExit;
        originalExit(code);
    };

    // Start the flow
    const flowPromise = ask(async ({ text, onCancel }) => {
        // Register a cancel callback
        onCancel(({ results, cleanup }) => {
            cancelCallbackCalled = true;
            console.log("✓ onCancel callback executed (first Ctrl+C)");

            // Don't call cleanup or exit - we want to test the second Ctrl+C
        });

        // Simulate waiting for user input
        await new Promise(resolve => setTimeout(resolve, 100));

        const name = await text({
            label: "What's your name?",
        });

        return { name };
    });

    // Give the flow time to start
    await new Promise(resolve => setTimeout(resolve, 200));

    // Get the runtime instance through the internal API
    // Note: This is a test-only approach to access the runtime
    const runtime = global.__askerooTestRuntime;

    if (!runtime) {
        console.error("✗ Could not access runtime for testing");
        process.exit(1);
        return;
    }

    // Simulate first Ctrl+C
    console.log("Simulating first Ctrl+C...");
    runtime.handleCtrlC();

    // Give callbacks time to execute
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify first Ctrl+C behavior
    if (cancelCallbackCalled) {
        console.log("✓ First Ctrl+C triggered onCancel callback");
    } else {
        console.error("✗ First Ctrl+C did NOT trigger onCancel callback");
        process.exit(1);
    }

    // Simulate second Ctrl+C
    console.log("\nSimulating second Ctrl+C...");
    runtime.handleCtrlC();

    // The second Ctrl+C should have called process.exit(1)
    // If we reach this point, the test failed
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!processExitCalled) {
        console.error("✗ Second Ctrl+C did NOT call process.exit()");
        process.exit(1);
    }
}

testDoubleCtrlCProgrammatic().catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
});

