#!/usr/bin/env node

/**
 * Interactive test for Ctrl+C / onCancel functionality
 * Run this directly with: node test-ctrlc-interactive.js
 *
 * IMPORTANT: This must be run in a REAL terminal (Terminal.app, iTerm2, etc.)
 * It will NOT work in Cursor's integrated terminal due to raw mode limitations.
 */

import { ask } from "./dist/src/index.js";
import { text } from "./dist/src/built-ins/text/index.js";

console.log("╔═══════════════════════════════════════════════╗");
console.log("║       Ctrl+C / onCancel Test (v2)            ║");
console.log("╚═══════════════════════════════════════════════╝\n");
console.log("This test demonstrates:");
console.log("  1. Ctrl+C exits gracefully at any time");
console.log("  2. onCancel callbacks are executed");
console.log("  3. Handler runs FIRST (via prependListener)\n");
console.log("📝 Try pressing Ctrl+C at ANY time!\n");

try {
    const result = await ask(async ({ onCancel }) => {
        // Register cleanup callbacks
        onCancel(() => {
            console.log("\n");
            console.log("┌─────────────────────────────────────┐");
            console.log("│  🚫 Flow Cancelled!                 │");
            console.log("│                                     │");
            console.log("│  ✓ Cleanup callback executed        │");
            console.log("│  ✓ Resources would be cleaned up    │");
            console.log("│  ✓ Connections would be closed      │");
            console.log("└─────────────────────────────────────┘");
        });

        const name = await text({ label: "What's your name?" });
        const email = await text({ label: "What's your email?" });

        return { name, email };
    });

    console.log("\n✅ Flow completed successfully!");
    console.log("Result:", result);

} catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
}

