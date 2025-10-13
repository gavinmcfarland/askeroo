/**
 * Test for double Ctrl+C force quit behavior
 *
 * This test verifies that:
 * 1. First Ctrl+C triggers onCancel callbacks
 * 2. Second Ctrl+C forces an immediate exit with process.exit(1)
 *
 * Usage: node test-double-ctrlc.js
 * Then press Ctrl+C twice rapidly to test the force quit behavior
 */

const { ask, text } = require("./dist/index.js");

async function testDoubleCtrlC() {
    console.log("Testing double Ctrl+C force quit behavior");
    console.log("Press Ctrl+C once to trigger onCancel, then press again to force quit\n");

    try {
        const result = await ask(async ({ text, onCancel }) => {
            // Register a cancel callback
            onCancel(({ results, cleanup }) => {
                console.log("\n✓ First Ctrl+C detected!");
                console.log("  Running cleanup callbacks...");
                console.log("  Press Ctrl+C again to force quit immediately");

                // Don't call cleanup or exit - let the user press Ctrl+C again
                // to test the force quit behavior
            });

            const name = await text({
                label: "What's your name?",
            });

            const email = await text({
                label: "What's your email?",
            });

            return { name, email };
        });

        console.log("\nFlow completed successfully!");
        console.log("Result:", result);
    } catch (error) {
        console.error("\nFlow failed:", error.message);
        process.exit(1);
    }
}

testDoubleCtrlC();

