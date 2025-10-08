#!/usr/bin/env node
/**
 * Example: Creating a custom plugin using askeroo/core imports
 *
 * Demonstrates:
 * - Importing from askeroo/core (cleaner than relative paths)
 * - Using Plugin State Context for external state updates
 * - Creating a custom plugin with createPrompt
 */
import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import { ask } from "../src/index.js";
import {
	createPrompt,
	usePromptState,
	getPromptStateNotifier,
} from "../src/core.js";

// Global store for our custom prompt
const customStore = {
	messages: [] as string[],
};

// API to add messages externally
export function addMessage(message: string) {
	customStore.messages.push(message);

	// Notify prompts to update
	const notifyChange = getPromptStateNotifier();
	if (notifyChange) {
		notifyChange();
	}
}

// Custom prompt that displays messages
interface MessageBoardOptions {
	label: string;
	maxMessages?: number;
}

export const messageBoard = createPrompt<MessageBoardOptions, void>({
	type: "messageBoard",
	component: ({ node, options, events }: any) => {
		// Subscribe to prompt state updates
		const { revision } = usePromptState();

		// Read messages during render (prevents flicker)
		const messages = options.maxMessages
			? customStore.messages.slice(-options.maxMessages)
			: customStore.messages;

		// Force re-render when revision changes
		void revision;

		// Auto-submit
		useEffect(() => {
			if (node.state === "active" && events.onSubmit) {
				const timer = setTimeout(() => {
					events.onSubmit({ type: "auto" });
				}, 10);
				return () => clearTimeout(timer);
			}
		}, [node.state, events.onSubmit]);

		if (messages.length === 0) {
			return <Text color="gray">No messages yet...</Text>;
		}

		return (
			<Box flexDirection="column" borderStyle="round" padding={1}>
				<Text bold color="cyan">
					{options.label}
				</Text>
				{messages.map((msg, idx) => (
					<Text key={idx} color="green">
						• {msg}
					</Text>
				))}
			</Box>
		);
	},
});

// Demo flow
const flow = async () => {
	// Show initial empty message board
	await messageBoard({ label: "📋 Message Board", maxMessages: 5 });

	// Add some messages externally
	addMessage("System initialized");
	await new Promise((resolve) => setTimeout(resolve, 500));

	addMessage("Loading configuration");
	await new Promise((resolve) => setTimeout(resolve, 500));

	addMessage("Ready!");

	// Show updated message board
	await messageBoard({ label: "📋 Message Board", maxMessages: 5 });

	return "✅ Custom plugin with askeroo/core imports works!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log("\n" + result);
	} catch (error) {
		console.error("❌ Error:", error);
		process.exit(1);
	}
})();
