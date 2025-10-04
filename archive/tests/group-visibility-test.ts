// Test to debug group visibility filtering
// Run with: npx tsx src/tests/group-visibility-test.ts

import { PromptTreeManager } from "../core/PromptTree.js";
import { PromptTreeAdapter } from "../core/PromptTreeAdapter.js";

console.log("👁️ Testing Group Visibility Filtering...\n");

// Create tree manager and adapter
const treeManager = new PromptTreeManager();
const adapter = new PromptTreeAdapter(treeManager);

// Recreate a scenario similar to user's setup
console.log("Step 1: Creating a realistic group structure...");

const mainGroup = {
	type: "group",
	id: "main-group",
	label: "Configuration Settings",
	flow: "progressive" as const,
	depth: 0,
};
adapter.addPromptRequestToTree(mainGroup);

const nameField = {
	type: "text",
	id: "user-name",
	label: "Enter your name",
	depth: 1,
};
adapter.addPromptRequestToTree(nameField, "main-group");

const emailField = {
	type: "text",
	id: "user-email",
	label: "Enter your email",
	depth: 1,
};
adapter.addPromptRequestToTree(emailField, "main-group");

console.log("✓ Created group with 2 fields");

console.log("\nStep 2: Current tree state:");
// Debug output removed

console.log("\nStep 3: Testing visibility filtering logic...");

const tree = treeManager.getTree();

function testVisibilityFiltering(
	groupNode: any,
	showOnlyActiveAndCompleted: boolean = false
) {
	console.log(
		`\n🔍 Testing group "${groupNode.id}" (label: "${groupNode.label}"):`
	);
	console.log(`  - Type: ${groupNode.type}`);
	console.log(`  - Flow: ${groupNode.flow}`);
	console.log(`  - Children count: ${groupNode.children?.length || 0}`);
	console.log(
		`  - showOnlyActiveAndCompleted: ${showOnlyActiveAndCompleted}`
	);

	if (!groupNode.children || groupNode.children.length === 0) {
		console.log(`  ❌ No children - group will not render`);
		return false;
	}

	// Simulate the exact filtering logic from RecursiveGroupContainer
	const visibleChildren = groupNode.children.filter((child: any) => {
		console.log(`    Checking child "${child.id}" (${child.type}):`);
		console.log(`      - active: ${child.active}`);
		console.log(`      - completed: ${child.completed}`);
		console.log(`      - visited: ${child.visited}`);

		if (showOnlyActiveAndCompleted) {
			const isVisible = child.active || child.completed || child.visited;
			console.log(
				`      - visible (showOnlyActiveAndCompleted): ${isVisible}`
			);
			return isVisible;
		}

		// For static groups, show all discovered children
		if (groupNode.flow === "static") {
			console.log(`      - visible (static group): true`);
			return true;
		}

		// For root level (no flow), show first pending field
		if (!groupNode.flow && groupNode.id === "root") {
			if (child.completed || child.active) {
				console.log(`      - visible (root, completed/active): true`);
				return true;
			}
			// Show first pending field
			const siblings = groupNode.children;
			const childIndex = siblings.indexOf(child);
			const allPreviousCompleted = siblings
				.slice(0, childIndex)
				.every((prev: any) => prev.completed);
			console.log(
				`      - visible (root, first pending): ${allPreviousCompleted}`
			);
			return allPreviousCompleted;
		}

		// For progressive/phased groups, show completed, active, and the next pending field
		if (child.completed || child.active) {
			console.log(
				`      - visible (progressive, completed/active): true`
			);
			return true;
		}

		// Also show the first pending field that should be next
		if (groupNode.flow === "progressive") {
			const siblings = groupNode.children;
			const childIndex = siblings.indexOf(child);
			const allPreviousCompleted = siblings
				.slice(0, childIndex)
				.every((prev: any) => prev.completed);
			console.log(
				`      - visible (progressive, next pending): ${allPreviousCompleted}`
			);
			return allPreviousCompleted;
		}

		console.log(`      - visible (default): false`);
		return false;
	});

	console.log(`  - Visible children count: ${visibleChildren.length}`);

	if (visibleChildren.length === 0) {
		console.log(
			`  ❌ No visible children - group will not render (LABEL WON'T SHOW)`
		);
		return false;
	}

	console.log(`  ✅ Group will render with label`);
	return true;
}

// Test the main group
const mainGroupNode = tree.root.children.find(
	(child: any) => child.id === "main-group"
);
if (mainGroupNode) {
	testVisibilityFiltering(mainGroupNode, false);
	testVisibilityFiltering(mainGroupNode, true);
}

// Test root group
console.log("\n🔍 Testing root group:");
testVisibilityFiltering(tree.root, false);

console.log("\nStep 4: Potential solutions:");
console.log("💡 If groups with labels are not showing:");
console.log("  1. The group has no visible children due to filtering logic");
console.log(
	"  2. All children are in pending state and visibility rules filter them out"
);
console.log(
	"  3. Need to adjust visibility logic to show groups with labels even if no visible children"
);

console.log("\nStep 5: Recommended fix:");
console.log(
	"🔧 Consider showing group labels even when no children are visible"
);
console.log(
	'   - This would mean removing the "return null" when visibleChildren.length === 0'
);
console.log("   - Or adding a condition to show label-only groups");

console.log("\n🎉 Group visibility test completed!");
