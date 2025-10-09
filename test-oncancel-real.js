#!/usr/bin/env node

import { ask } from "./dist/src/index.js";
import { text } from "./dist/src/built-ins/text/index.js";
import { confirm } from "./dist/src/built-ins/confirm/index.js";

console.log("Testing onCancel event listener...");
console.log("Press Ctrl+C to trigger the cancel callback\n");

const result = await ask(async ({ onCancel }) => {
    // Register a cancel callback
    onCancel(() => {
        console.log("\n🚫 Flow cancelled! Cleaning up...");
        console.log("This is where you would clean up resources, close connections, etc.");
    });

    const name = await text({ label: "What's your name?" });
    const age = await text({ label: "How old are you?" });
    const confirmed = await confirm({
        label: `Is ${name} (${age} years old) correct?`,
    });

    return { name, age, confirmed };
});

console.log("\n✅ Flow completed successfully!");
console.log("Result:", result);

