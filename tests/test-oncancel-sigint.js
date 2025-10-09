import { createRuntime } from "../dist/src/core/core.js";
import { ui } from "../dist/src/core/ui.js";

async function testSIGINT() {
    console.log("Testing SIGINT (Ctrl+C) handling...\n");

    const runtime = createRuntime(ui);
    let callbackCalled = false;

    try {
        // Start a flow that will wait for input
        const promise = runtime.executeFlow(async ({ onCancel }) => {
            // Register a cancel callback
            onCancel(() => {
                callbackCalled = true;
                console.log("✅ Cancel callback was called!");
            });

            console.log("Press Ctrl+C to test cancellation...");
            console.log("(Test will auto-complete in 3 seconds if not cancelled)\n");

            // Wait for a bit to allow manual testing
            await new Promise((resolve) => setTimeout(resolve, 3000));

            return { completed: true };
        });

        const result = await promise;

        if (!callbackCalled) {
            console.log("✅ Flow completed normally (no cancellation)");
            console.log("   To test cancellation, press Ctrl+C before the 3-second timeout");
        }

        process.exit(0);
    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    }
}

testSIGINT();

