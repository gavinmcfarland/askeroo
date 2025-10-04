#!/usr/bin/env node
import { ask, text, radio } from "../dist/src/index.js";

const flow = async () => {
	// First field - normal behavior (can go back)
	const name = await text({
		label: "What's your name?",
		initialValue: "Test User"
	});

	// Second field - with allowBack: false (cannot go back)
	const choice = await radio({
		label: "Choose an option (you cannot go back from this field):",
		options: [
			{ value: "option1", label: "Option 1" },
			{ value: "option2", label: "Option 2" },
			{ value: "option3", label: "Option 3" }
		],
		allowBack: false
	});

	// Third field - normal behavior again
	const confirmation = await text({
		label: "Confirm your choice:",
		initialValue: choice
	});

	return { name, choice, confirmation };
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
