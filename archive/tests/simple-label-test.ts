// Simple test to check if group labels are working
// Run with: npx tsx src/tests/simple-label-test.ts

import { PromptTreeManager } from "../core/PromptTree.js";
import { PromptTreeAdapter } from "../core/PromptTreeAdapter.js";

console.log("🧪 Simple Group Label Test...\n");

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

console.log("Step 1: Creating group exactly like the real app does...");

// Simulate exactly how ui.tsx creates groups
const groupRequest = {
	type: "group",
	id: "test-group-123",
	label: "My Test Group Label",
	flow: "progressive" as const,
	depth: 0,
};

console.log("Group request:", groupRequest);

// Add to tree
const groupNode = adapter.addPromptRequestToTree(groupRequest);

console.log("Created group node:", {
	id: groupNode.id,
	type: groupNode.type,
	label: groupNode.label,
	depth: groupNode.depth,
	hasChildren: groupNode.children && groupNode.children.length > 0,
});

console.log("\nStep 2: Testing the rendering conditions...");

// Test all the conditions that RecursiveGroupContainer checks

console.log("Testing RecursiveGroupContainer conditions:");

// Condition 1: Is it a group?
const isGroup = groupNode.type === "group";
console.log(`1. Is group: ${isGroup}`);

// Condition 2: Does it have children?
const hasChildren = groupNode.children && groupNode.children.length > 0;
console.log(`2. Has children: ${hasChildren}`);

// This should trigger the early return for empty groups
if (!hasChildren) {
	console.log(
		`3. Empty group check: ${
			!groupNode.children || groupNode.children.length === 0
		}`
	);
	console.log(`4. Has label: ${!!groupNode.label}`);
	console.log(`5. Label value: "${groupNode.label}"`);

	if (groupNode.label) {
		console.log("✅ Should render label for empty group with my fix");
	} else {
		console.log("❌ No label to render");
	}
}

console.log("\nStep 3: Adding a field to make it non-empty...");

const fieldRequest = {
	type: "text",
	id: "test-field",
	label: "Test field",
	depth: 1,
};

adapter.addPromptRequestToTree(fieldRequest, "test-group-123");

console.log("Updated group node:", {
	id: groupNode.id,
	type: groupNode.type,
	label: groupNode.label,
	depth: groupNode.depth,
	hasChildren: groupNode.children && groupNode.children.length > 0,
	childrenCount: groupNode.children?.length || 0,
});

console.log("\nStep 4: Testing visibility filtering...");

// Test the visibility filtering for non-empty group
if (groupNode.children && groupNode.children.length > 0) {
	console.log("Children details:");
	groupNode.children.forEach((child: any, index: number) => {
		console.log(`  Child ${index}: ${child.id} (${child.type})`);
		console.log(`    - active: ${child.active}`);
		console.log(`    - completed: ${child.completed}`);
		console.log(`    - visited: ${child.visited}`);
	});

	// Test showOnlyActiveAndCompleted filtering
	const visibleWithFilter = groupNode.children.filter((child: any) => {
		return child.active || child.completed || child.visited;
	});

	console.log(
		`Visible children with showOnlyActiveAndCompleted=true: ${visibleWithFilter.length}`
	);

	if (visibleWithFilter.length === 0) {
		console.log(
			"✅ This would trigger the visibleChildren.length === 0 condition"
		);
		console.log(
			"✅ With my fix, should show label even with no visible children"
		);
	}

	// Test normal visibility (progressive flow)
	const child = groupNode.children[0];
	const allPreviousCompleted = true; // First child, no previous
	const visibleNormally =
		child.completed || child.active || allPreviousCompleted;
	console.log(`First child visible normally: ${visibleNormally}`);
}

console.log("\nStep 5: Tree structure:");
// Debug output removed

console.log("\n🎯 Summary:");
console.log(`Group "${groupNode.id}" with label "${groupNode.label}"`);
console.log("Should show label in the following scenarios:");
console.log("  ✓ Empty group with label (first fix)");
console.log("  ✓ Group with no visible children but has label (second fix)");
console.log("  ✓ Group with visible children (normal case)");

console.log("\n💡 If labels still not showing, check:");
console.log("  1. Is RecursiveGroupContainer actually being called?");
console.log("  2. Are there wrapper components hiding the output?");
console.log("  3. Is the actual CLI using different props or state?");

console.log("\n🎉 Simple label test completed!");
