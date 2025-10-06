import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../core/registry.js";
import { ValidatorFunction, PluginComponentProps } from "../../types/index.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";

/**
 * User-provided options for the text input plugin
 */
export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
}

// Core text input plugin
export const text = createPlugin<TextOptions, string>({
	type: "text",
	interactive: true,

	render: ({
		node,
		options,
		events,
	}: PluginComponentProps<TextOptions, string>) => {
		const [value, setValue] = useState(options.initialValue || "");
		const [cursorPosition, setCursorPosition] = useState(
			(options.initialValue || "").length
		);
		const [submitted, setSubmitted] = useState(false);
		const [validationError, setValidationError] = useState<string | null>(
			null
		);

		// Reset state when field becomes active
		const disabled = node.state === "disabled";
		useFieldReset(disabled, submitted, setSubmitted);

		useEffect(() => {
			if (!disabled) {
				setValue(options.initialValue || "");
				setCursorPosition((options.initialValue || "").length);
			}
		}, [options.initialValue, disabled]);

		// Validation helper
		const runValidation = async (val: string): Promise<boolean> => {
			if (!events.onValidate || node.state !== "active") {
				setValidationError(null);
				return true;
			}
			try {
				const result = await events.onValidate(val);
				setValidationError(result);
				return result === null;
			} catch {
				setValidationError("Validation error occurred");
				return false;
			}
		};

		// Hint management
		useEffect(() => {
			if (!events.onHintChange) return;
			events.onHintChange(
				node.state === "active" &&
					!node.isFirstRootPrompt &&
					node.allowBack ? (
					<>
						<Text color="yellow">escape</Text> go back
					</>
				) : null
			);
		}, [
			node.state,
			node.isFirstRootPrompt,
			node.allowBack,
			events.onHintChange,
		]);

		useInput(
			async (input, key) => {
				if (submitted || node.state !== "active") return;

				// Keyboard shortcuts
				if (
					(key.ctrl && input === "u") ||
					(key.meta && input === "k")
				) {
					setValue("");
					setCursorPosition(0);
					return;
				}
				if (key.ctrl && input === "a") {
					setCursorPosition(0);
					return;
				}
				if (key.ctrl && input === "e") {
					setCursorPosition(value.length);
					return;
				}

				// Cursor movement (not in static group arrow nav mode)
				if (!(node.flow === "static" && node.enableArrowNavigation)) {
					if (key.leftArrow) {
						setCursorPosition(Math.max(0, cursorPosition - 1));
						return;
					}
					if (key.rightArrow) {
						setCursorPosition(
							Math.min(value.length, cursorPosition + 1)
						);
						return;
					}
				}

				// Static group navigation
				if (node.flow === "static" && node.enableArrowNavigation) {
					if (key.downArrow && !node.isLastInGroup) {
						if (!(await runValidation(value))) return;
						setSubmitted(true);
						events.onSubmit?.(value);
						return;
					}
					if (key.upArrow && !node.isFirstInGroup) {
						if (!(await runValidation(value))) return;
						setSubmitted(true);
						events.onSubmit?.({ __preserveAndBack: true, value });
						return;
					}
					if (key.downArrow || key.upArrow) return;
				}

				// Escape handling
				if (node.flow === "static" && key.escape) {
					if (node.enableArrowNavigation && !node.isFirstInGroup) {
						if (!(await runValidation(value))) return;
						setSubmitted(true);
						events.onSubmit?.({ __preserveAndBack: true, value });
					} else if (
						node.enableArrowNavigation &&
						node.isFirstInGroup
					) {
						setSubmitted(true);
						events.onSubmit?.({ __clearGroupAndBack: true });
					} else if (node.allowBack && events.onBack) {
						events.onBack();
					}
					return;
				}

				if (key.return) {
					if (!(await runValidation(value))) return;
					setSubmitted(true);
					events.onSubmit?.(value);
				} else if (key.backspace || key.delete) {
					if (cursorPosition > 0) {
						setValue(
							value.slice(0, cursorPosition - 1) +
								value.slice(cursorPosition)
						);
						setCursorPosition(cursorPosition - 1);
					}
				} else if (
					key.escape &&
					node.flow !== "static" &&
					node.allowBack &&
					events.onBack
				) {
					events.onBack();
				} else if (!key.ctrl && !key.meta && input) {
					setValue(
						value.slice(0, cursorPosition) +
							input +
							value.slice(cursorPosition)
					);
					setCursorPosition(cursorPosition + 1);
				}
			},
			{ isActive: node.state === "active" && !submitted }
		);

		if (node.state === "completed") {
			return (
				<Box flexDirection="column">
					<Text>{options.label}</Text>
					<Text color="blue">{node.completedValue || value}</Text>
				</Box>
			);
		}

		if (node.state === "disabled") {
			return (
				<Box gap={1}>
					<Box width={14}>
						<Text dimColor>
							{options.shortLabel || options.label}
						</Text>
					</Box>
					<Text dimColor color="gray">
						...
					</Text>
				</Box>
			);
		}

		return (
			<Box flexDirection="column">
				<Box
					flexDirection={node.flow === "static" ? "row" : "column"}
					gap={node.flow === "static" ? 1 : 0}
					marginBottom={
						node.flow === "static" && !node.isLastInGroup ? 1 : 0
					}
				>
					<Box width={node.flow === "static" ? 14 : undefined}>
						<Text>{options.label}</Text>
					</Box>
					<Text color="cyan">
						{value.slice(0, cursorPosition)}
						{cursorPosition < value.length && (
							<Text backgroundColor="grey" color="black">
								{value[cursorPosition]}
							</Text>
						)}
						{cursorPosition >= value.length && (
							<Text backgroundColor="grey" color="black">
								{" "}
							</Text>
						)}
						{value.slice(
							cursorPosition +
								(cursorPosition < value.length ? 1 : 0)
						)}
						{value.length === 0 && cursorPosition === 0 && "\u200B"}
					</Text>
				</Box>
				{validationError && (
					<Box>
						<Text color="red">{validationError}</Text>
					</Box>
				)}
			</Box>
		);
	},
});
