#!/usr/bin/env node

/**
 * Basic test to verify SIGINT handler works in this environment
 */

console.log("Testing basic SIGINT handling...");
console.log("Process started. Press Ctrl+C to exit.\n");

let handlerRegistered = false;

const handler = () => {
    console.log("\n✅ SIGINT received! Handler works!");
    console.log("Exiting gracefully...");
    process.exit(0);
};

process.on("SIGINT", handler);
handlerRegistered = true;

console.log(`Handler registered: ${handlerRegistered}`);
console.log("Waiting for Ctrl+C...");
console.log("(This will wait forever until you press Ctrl+C)\n");

// Keep process alive
setInterval(() => {
    // Do nothing, just keep alive
}, 1000);

