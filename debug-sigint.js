#!/usr/bin/env node

/**
 * Debug SIGINT handling to see what's actually happening
 */

import { createRuntime } from "./dist/src/core/core.js";
import { ui } from "./dist/src/core/ui.js";

console.log("=== SIGINT Debug Test ===\n");

// Log all SIGINT listeners
function logSIGINTListeners() {
    const listeners = process.listeners('SIGINT');
    console.log(`Number of SIGINT listeners: ${listeners.length}`);
    listeners.forEach((listener, i) => {
        console.log(`  Listener ${i + 1}: ${listener.name || 'anonymous'}`);
    });
}

console.log("1. Before runtime creation:");
logSIGINTListeners();

console.log("\n2. Creating runtime...");
const runtime = createRuntime(ui);

console.log("\n3. After runtime creation:");
logSIGINTListeners();

console.log("\n4. Starting flow...");

// Don't await - we want to see if handlers change during flow
runtime.executeFlow(async ({ onCancel }) => {
    console.log("\n5. Inside flow:");
    logSIGINTListeners();

    onCancel(() => {
        console.log("\n🎯 MY CALLBACK EXECUTED!");
    });

    console.log("\n6. After onCancel registered:");
    logSIGINTListeners();

    console.log("\n✅ Flow started successfully!");
    console.log("📝 Now press Ctrl+C...");
    console.log("   If nothing happens, there's a problem with SIGINT handling");

    // Wait forever
    await new Promise(() => { });
}).catch(error => {
    console.error("\n❌ Flow error:", error.message.split('\n')[0]);
    console.log("\n7. After error:");
    logSIGINTListeners();
    process.exit(1);
});

