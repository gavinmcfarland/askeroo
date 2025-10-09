/**
 * Test that Ctrl+C always works, even if the flow never starts
 */

import { createRuntime } from "../dist/src/core/core.js";
import { ui } from "../dist/src/core/ui.js";

console.log("Testing that Ctrl+C works immediately after runtime creation...\n");

// Mock process.exit
const originalExit = process.exit;
let exitCalled = false;
process.exit = (code) => {
    exitCalled = true;
    console.log(`✅ Ctrl+C worked! process.exit(${code}) was called`);
    process.exit = originalExit;
    originalExit(0);
};

try {
    // Create runtime (this should register SIGINT handler immediately)
    const runtime = createRuntime(ui);
    console.log("Runtime created");

    // Send SIGINT immediately, before any flow starts
    setTimeout(() => {
        console.log("Sending SIGINT (simulating Ctrl+C)...\n");
        process.emit("SIGINT");

        setTimeout(() => {
            if (!exitCalled) {
                console.log("❌ FAILED: Ctrl+C did not work!");
                process.exit = originalExit;
                originalExit(1);
            }
        }, 100);
    }, 100);

} catch (error) {
    console.error("❌ Error:", error);
    process.exit = originalExit;
    originalExit(1);
}

