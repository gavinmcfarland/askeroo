#!/usr/bin/env node
import {
	ask,
	text,
	confirm,
	note,
	radio,
	completedFields,
} from "../src/index.js";

/**
 * Example demonstrating the new submission type system
 *
 * This example shows:
 * 1. Instance-level autoSubmit control
 * 2. How submission types affect back navigation
 * 3. Mixing auto-submit and manual prompts
 */

const flow = async () => {
	// Welcome message - auto-submits automatically, can't go back to it
	await note(
		"**Welcome to the Submission Type Demo!**\n\nThis example demonstrates the new submission type system.",
		{
			allowBack: false, // Explicitly prevent going back to welcome
		}
	);

	// Show completed fields (if any) - auto-submits automatically
	// Users can't go back to this since it's just a display
	await completedFields({
		maxFields: 3,
		allowBack: false,
	});

	// Regular input - manual submission, can go back normally
	const userName = await text({
		label: "What's your name?",
		initialValue: "",
	});

	// Info note - auto-submits automatically
	await note(`Thanks ${userName}! Let's configure your preferences.`, {
		allowBack: false,
	});

	// Choice with manual submission
	const theme = await radio({
		label: "Choose a theme",
		options: [
			{ value: "dark", label: "Dark Mode" },
			{ value: "light", label: "Light Mode" },
			{ value: "auto", label: "Auto (System)" },
		],
	});

	// Note: The note plugin auto-submits by default (embedded in component logic)

	// Confirmation - user can go back to change theme
	const confirmed = await confirm({
		label: "Is this correct?",
		initialValue: true,
	});

	if (!confirmed) {
		// User can navigate back to change their choices
		// But they won't be able to go back to the auto-submitted notes
		await note("Please adjust your settings.");
	}

	// Final confirmation that prevents going back
	const finalConfirm = await confirm({
		label: "Finalize settings?",
		initialValue: true,
		allowBack: false, // Point of no return
	});

	// Success message - auto-submits automatically
	await note("**Setup Complete!**\n\nYour preferences have been saved.", {
		allowBack: false,
	});

	return {
		userName,
		theme,
		confirmed,
		finalConfirm,
	};
};

(async () => {
	try {
		const result = await ask(flow);

		console.log("\n✅ Flow completed!");
		console.log("Final result:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
