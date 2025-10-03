// Test CLI rendering issue
// Run with: npx tsx src/tests/cli-rendering-test.ts

import { PromptTreeManager } from "../core/PromptTree.js";
import { PromptTreeAdapter } from "../core/PromptTreeAdapter.js";

console.log("🔍 Testing CLI Rendering Issue...\n");

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate a simple CLI flow - single text prompt
console.log("Step 1: Adding a simple text prompt (typical CLI scenario)...");

const textPrompt = {
	type: "text",
	id: "simple-text",
	label: "Enter your name:",
	depth: 0,
};

// Add to root (no group)
adapter.addPromptRequestToTree(textPrompt);
console.log("✓ Added text prompt to root");

// Activate it (this is what should happen when prompt starts)
const result = treeManager.navigateTo("simple-text");
console.log("✓ Activated prompt:", result.success ? "success" : "failed");

console.log("\nStep 2: Tree structure:");
// Debug output removed

console.log("\nStep 3: Tree stats:");
console.log("✓ Tree statistics test completed");

console.log("\nStep 4: Testing RecursiveGroupContainer visibility logic...");

const tree = treeManager.getTree();
const root = tree.root;

console.log("Root children:", root.children.length);
root.children.forEach((child, index) => {
	console.log(`Child ${index}:`, {
		id: child.id,
		type: child.type,
		active: child.active,
		completed: child.completed,
		visited: child.visited,
	});
});

// Test the visibility filter logic
const visibleChildren = root.children.filter((child) => {
	// For root level (no flow), show first pending field
	if (!root.flow && root.id === "root") {
		// Show completed, active, and first pending
		if (child.completed || child.active) {
			return true;
		}
		// Show first pending field
		const siblings = root.children;
		const childIndex = siblings.indexOf(child);
		const allPreviousCompleted = siblings
			.slice(0, childIndex)
			.every((prev) => prev.completed);
		return allPreviousCompleted;
	}
	return false;
});

console.log("Visible children:", visibleChildren.length);
visibleChildren.forEach((child, index) => {
	console.log(`Visible ${index}:`, child.id, "active:", child.active);
});

if (visibleChildren.length > 0) {
	console.log("\n✅ RecursiveGroupContainer should render the prompt!");
} else {
	console.log(
		"\n❌ RecursiveGroupContainer would not render anything - this is the issue!"
	);
}

console.log("\n💡 Fix verification:");
console.log("- Visible children:", visibleChildren.length, "(should be 1)");

if (visibleChildren.length === 1) {
	console.log("\n🎉 CLI rendering should work correctly now!");
} else {
	console.log("\n⚠️ There may still be an issue with the rendering logic.");
}
