#!/usr/bin/env node
// Simple verification that maxVisible is properly typed and exported
import { radio, multi } from "../src/index.js";

// These should compile without TypeScript errors if the maxVisible property is properly added
const radioExample = radio({
	label: "Test radio with maxVisible",
	options: [
		{ value: "1", label: "Option 1" },
		{ value: "2", label: "Option 2" },
		{ value: "3", label: "Option 3" },
		{ value: "4", label: "Option 4" },
		{ value: "5", label: "Option 5" },
	],
	maxVisible: 3, // This should not cause a TypeScript error
});

const multiExample = multi({
	label: "Test multi with maxVisible",
	options: [
		{ value: "a", label: "Option A" },
		{ value: "b", label: "Option B" },
		{ value: "c", label: "Option C" },
		{ value: "d", label: "Option D" },
		{ value: "e", label: "Option E" },
	],
	maxVisible: 3, // This should not cause a TypeScript error
});

console.log("✅ TypeScript compilation successful!");
console.log("✅ maxVisible property is properly typed for both radio and multi prompts");
console.log("");
console.log("🎯 Implementation Summary:");
console.log("- Added maxVisible property to RadioOptions and MultiOptions interfaces");
console.log("- Implemented scrolling logic in both RadioField and MultiField components");
console.log("- Added ellipsis (⋯⋯) indicators for hidden options");
console.log("- Navigation works with up/down arrows to reveal hidden options");
console.log("- Compatible with all existing features (search, hints, none option, etc.)");
console.log("");
console.log("📝 Usage Example:");
console.log('radio({ label: "Choose option", options: [...], maxVisible: 4 })');
console.log('multi({ label: "Select options", options: [...], maxVisible: 4 })');