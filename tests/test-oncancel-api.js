import { createRuntime } from "../dist/src/core/core.js";
import { ui } from "../dist/src/core/ui.js";

async function testOnCancelAPI() {
    console.log("Testing onCancel API...\n");

    const runtime = createRuntime(ui);
    let cancelCallbackRegistered = false;

    try {
        // Start the flow (it will complete immediately)
        const promise = runtime.executeFlow(async ({ onCancel }) => {
            // Test 1: onCancel should be a function
            if (typeof onCancel !== "function") {
                throw new Error("onCancel is not a function");
            }
            console.log("✅ Test 1: onCancel is available as a function");

            // Test 2: Register a cancel callback
            onCancel(() => {
                console.log("Cancel callback was called");
                cancelCallbackRegistered = true;
            });
            console.log("✅ Test 2: Cancel callback registered successfully");

            // Test 3: Multiple callbacks can be registered
            onCancel(() => {
                console.log("Second cancel callback");
            });
            console.log("✅ Test 3: Multiple callbacks can be registered");

            // Return immediately to complete the flow
            return { success: true };
        });

        const result = await promise;
        console.log("✅ Test 4: Flow completed successfully with result:", result);
        console.log("\n🎉 All tests passed!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Test failed:", error);
        process.exit(1);
    }
}

testOnCancelAPI();

