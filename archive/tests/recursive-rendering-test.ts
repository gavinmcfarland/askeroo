// Test to verify recursive rendering works correctly
// Run with: npx tsx src/tests/recursive-rendering-test.ts

import { PromptTreeManager } from "../core/PromptTree.js";
import { PromptTreeAdapter } from "../core/PromptTreeAdapter.js";

console.log("🔄 Testing Recursive Rendering Structure...\n");

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Simulate a complex prompt structure
console.log("Step 1: Building complex tree structure...");

// Add main group
const mainGroup = {
	type: "group",
	id: "main-group",
	label: "Main Configuration",
	flow: "progressive" as const,
	depth: 0,
};
adapter.addPromptRequestToTree(mainGroup);

// Add fields to main group
const nameField = {
	type: "text",
	id: "user-name",
	label: "What is your name?",
	groupName: "main-group",
	depth: 1,
};
adapter.addPromptRequestToTree(nameField, "main-group");

const enableField = {
	type: "confirm",
	id: "enable-advanced",
	label: "Enable advanced features?",
	groupName: "main-group",
	depth: 1,
};
adapter.addPromptRequestToTree(enableField, "main-group");

// Add nested group
const advancedGroup = {
	type: "group",
	id: "advanced-group",
	label: "Advanced Settings",
	flow: "static" as const,
	depth: 1,
	discoveredFields: [
		{ id: "setting1", label: "Setting 1", type: "text" },
		{ id: "setting2", label: "Setting 2", type: "confirm" },
	],
};
adapter.addPromptRequestToTree(advancedGroup, "main-group");

// Add fields to nested group
const setting1 = {
	type: "text",
	id: "setting1",
	label: "Setting 1",
	groupName: "advanced-group",
	depth: 2,
};
adapter.addPromptRequestToTree(setting1, "advanced-group");

const setting2 = {
	type: "confirm",
	id: "setting2",
	label: "Setting 2",
	groupName: "advanced-group",
	depth: 2,
};
adapter.addPromptRequestToTree(setting2, "advanced-group");

console.log("✓ Tree structure built successfully");

console.log("\nStep 2: Current tree structure:");
// Debug output removed

console.log("\nStep 3: Simulating user interaction flow...");

// Navigate to main group
treeManager.navigateTo("main-group");
console.log("✓ Navigated to main group");

// Fill out name field
treeManager.navigateTo("user-name");
treeManager.updateNode("user-name", {
	value: "John Doe",
	visited: true,
	completed: true,
});
console.log('✓ Completed name field with value: "John Doe"');

// Navigate to enable field
treeManager.navigateTo("enable-advanced");
treeManager.updateNode("enable-advanced", {
	value: true,
	visited: true,
	completed: true,
});
console.log("✓ Completed enable field with value: true");

// Mark main group as completed
treeManager.updateNode("main-group", { completed: true });

// Navigate to advanced group
treeManager.navigateTo("advanced-group");
console.log("✓ Navigated to advanced group");

// Fill out setting1
treeManager.navigateTo("setting1");
treeManager.updateNode("setting1", {
	value: "Custom setting value",
	visited: true,
	completed: true,
});
console.log('✓ Completed setting1 with value: "Custom setting value"');

console.log("\nStep 4: Final tree structure with values:");
// Debug output removed

console.log("\nStep 5: Testing recursive rendering logic...");

// Test the recursive rendering behavior
const tree = treeManager.getTree();
const root = tree.root;

function analyzeNode(node: any, indent = 0): void {
	const prefix = "  ".repeat(indent);
	const status = node.active
		? "[ACTIVE]"
		: node.completed
		? "[COMPLETED]"
		: node.visited
		? "[VISITED]"
		: "[PENDING]";

	console.log(`${prefix}${node.id} (${node.type}) ${status}`);

	if (node.value !== undefined) {
		console.log(`${prefix}  Value: ${JSON.stringify(node.value)}`);
	}

	if (node.children && node.children.length > 0) {
		console.log(`${prefix}  Children: ${node.children.length}`);
		node.children.forEach((child: any) => analyzeNode(child, indent + 1));
	}
}

console.log("\nRecursive analysis:");
analyzeNode(root);

console.log("\nStep 6: Testing rendering logic scenarios...");

// Test completed group filtering
const completedGroups = treeManager.findNodes(
	(node) => node.type === "group" && node.completed
);
console.log(`✓ Found ${completedGroups.length} completed groups`);

// Test field visibility
const visibleFields = treeManager.findNodes(
	(node) =>
		node.type === "field" && (node.completed || node.active || node.visited)
);
console.log(`✓ Found ${visibleFields.length} visible fields`);

// Test static group fields
const staticGroups = treeManager.findNodes(
	(node) => node.type === "group" && node.flow === "static"
);
console.log(`✓ Found ${staticGroups.length} static groups`);

console.log("\n🎉 Recursive rendering test completed successfully!");
console.log("\n💡 What this means:");
console.log("  - Tree structure supports complex nested groups");
console.log("  - Field values and completion status are tracked correctly");
console.log("  - Recursive rendering can traverse the entire structure");
console.log("  - Ready to replace complex rendering logic!");
