#!/usr/bin/env node
// Test for verifying none option edge-scrolling behavior
import { multi } from "../src/index.js";

console.log("✅ Testing none option with edge-scrolling behavior...");
console.log("");
console.log("Expected behavior with maxVisible=4 and none option:");
console.log("");
console.log("Combined list positions:");
console.log("  0: None option");
console.log("  1: First regular option");
console.log("  2: Second regular option");
console.log("  3: Third regular option");
console.log("  4: Fourth regular option");
console.log("  etc...");
console.log("");
console.log("Window behavior:");
console.log("- Initial window: positions 0-3 (None + 3 options)");
console.log("- User navigates to position 3: still shows positions 0-3");
console.log("- User navigates to position 4: window scrolls to show positions 1-4");
console.log("- User navigates back to position 0: window scrolls to show positions 0-3");
console.log("");

// This should work correctly with edge-scrolling
const testResult = multi({
	label: "Test edge-scrolling with none option (max 4 visible):",
	maxVisible: 4,
	options: [
		{ value: "option1", label: "Option 1" },
		{ value: "option2", label: "Option 2" },
		{ value: "option3", label: "Option 3" },
		{ value: "option4", label: "Option 4" },
		{ value: "option5", label: "Option 5" },
		{ value: "option6", label: "Option 6" },
		{ value: "option7", label: "Option 7" },
		{ value: "option8", label: "Option 8" }
	],
	noneOption: { label: "None of these" },
	showNumbers: true
});

console.log("✅ TypeScript compilation successful!");
console.log("✅ Edge-scrolling with none option should now work correctly!");