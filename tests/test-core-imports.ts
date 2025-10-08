#!/usr/bin/env node
/**
 * Test: Verify askeroo/core imports work correctly
 */

// Test importing from askeroo/core
import {
	createPrompt,
	usePluginState,
	getPluginStateNotifier,
	registerPlugin,
	globalRegistry,
} from "../src/core.js";

console.log("✅ Test: askeroo/core imports\n");

// Verify exports exist
console.log("createPrompt:", typeof createPrompt);
console.log("usePluginState:", typeof usePluginState);
console.log("getPluginStateNotifier:", typeof getPluginStateNotifier);
console.log("registerPlugin:", typeof registerPlugin);
console.log("globalRegistry:", typeof globalRegistry);

// All should be functions or objects
const checks = [
	["createPrompt", typeof createPrompt === "function"],
	["usePluginState", typeof usePluginState === "function"],
	["getPluginStateNotifier", typeof getPluginStateNotifier === "function"],
	["registerPlugin", typeof registerPlugin === "function"],
	["globalRegistry", typeof globalRegistry === "object"],
];

const allPassed = checks.every(([_, passed]) => passed);

if (allPassed) {
	console.log("\n✅ All core imports working correctly!");
	process.exit(0);
} else {
	console.log("\n❌ Some imports failed:");
	checks.forEach(([name, passed]) => {
		if (!passed) {
			console.log(`  ❌ ${name}`);
		}
	});
	process.exit(1);
}
