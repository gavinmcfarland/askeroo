import { useState, useEffect } from "react";
import { Text, Box, useInput, Newline } from "ink";
import { createPrompt } from "../../core/registry.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";
import { TextInput } from "../../components/TextInput.js";

/**
 * User-provided options for the text input plugin
 */
export interface TextOptions {
	label: string;
	shortLabel?: string;
	initialValue?: string;
}

// Core text input plugin
export const text = createPrompt<TextOptions, string>({
	type: "text",
	// autoSubmit: false (default) - Requires user interaction

	component: ({ node, options, events }: any) => {
		const initialValue = options.initialValue || "";
		const [value, setValue] = useState(initialValue);
		const [submitted, setSubmitted] = useState(false);
		const [validationError, setValidationError] = useState<string | null>(
			null
		);

		// Reset state when field becomes active
		const disabled = node.state === "disabled";
		useFieldReset(disabled, submitted, setSubmitted);

		useEffect(() => {
			if (!disabled) {
				const initial = options.initialValue || "";
				setValue(initial);
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
						<Newline />
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
				if (key.escape) {
					if (node.flow === "static") {
						if (
							node.enableArrowNavigation &&
							!node.isFirstInGroup
						) {
							if (!(await runValidation(value))) return;
							setSubmitted(true);
							events.onSubmit?.({
								__preserveAndBack: true,
								value,
							});
						} else if (
							node.enableArrowNavigation &&
							node.isFirstInGroup
						) {
							setSubmitted(true);
							events.onSubmit?.({ __clearGroupAndBack: true });
						} else if (node.allowBack && events.onBack) {
							events.onBack();
						}
					} else if (node.allowBack && events.onBack) {
						events.onBack();
					}
					return;
				}
			},
			{ isActive: node.state === "active" && !submitted }
		);

		const handleSubmit = async (val: string) => {
			if (!(await runValidation(val))) return;
			setSubmitted(true);
			events.onSubmit?.(val);
		};

		const handleEscape = () => {
			if (node.allowBack && events.onBack && node.flow !== "static") {
				events.onBack();
			}
		};

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
					<TextInput
						value={value}
						onChange={setValue}
						onSubmit={handleSubmit}
						isActive={node.state === "active" && !submitted}
						color="cyan"
						onEscape={handleEscape}
						disableArrowKeys={
							node.flow === "static" && node.enableArrowNavigation
						}
					/>
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
