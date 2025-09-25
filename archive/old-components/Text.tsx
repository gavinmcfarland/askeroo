import React, { useState, useEffect } from "react";
import { Text as InkText, Box, useInput } from "ink";
import { FieldProps, BaseFieldConfig, PublicFieldConfig } from "../../types.js";
import { validate } from "../../hooks/index.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

// Text field specific properties
interface TextFieldSpecificConfig {
	required?: boolean;
	placeholder?: string;
	initialValue?: string;
}

// Internal text field configuration - includes internal properties
export interface InternalTextFieldConfig
	extends BaseFieldConfig,
		TextFieldSpecificConfig {}

// Text field configuration - excludes internal properties (user-facing API)
export interface TextFieldConfig
	extends Omit<PublicFieldConfig, "initialValue">,
		TextFieldSpecificConfig {}

export function Text({
	config,
	value,
	onChange,
	onSubmit,
	onBack,
	isActive,
}: FieldProps<string> & { config: InternalTextFieldConfig }) {
	const [input, setInput] = useState(value || config.initialValue || "");
	const [cursorPosition, setCursorPosition] = useState(
		(value || config.initialValue || "").length
	);
	const [error, setError] = useState<string | null>(null);

	const validateAndSetErrorValue = (value: string): boolean => {
		return validate(config, value, undefined, setError) as boolean;
	};

	useInput((keyInput, key) => {
		if (!isActive) return;

		// Handle back navigation (Escape)
		if (key.escape) {
			if (onBack) {
				config.onBack?.();
				onBack();
			}
			return;
		}

		if (key.return) {
			// Check required field validation first
			if (config.required && !input.trim()) {
				setError("This field is required");
				return;
			}

			// Then check custom validation
			if (validateAndSetErrorValue(input)) {
				onChange(input);
				onSubmit(input);
			}
			// If validation fails, don't submit - error is already set by validateAndSetError
			return;
		}

		// Handle cursor movement with arrow keys
		if (key.leftArrow) {
			setCursorPosition(Math.max(0, cursorPosition - 1));
			return;
		}

		if (key.rightArrow) {
			setCursorPosition(Math.min(input.length, cursorPosition + 1));
			return;
		}

		// Handle Ctrl+A to move cursor to beginning
		if (key.ctrl && keyInput === "a") {
			setCursorPosition(0);
			return;
		}

		// Handle Ctrl+E to move cursor to end
		if (key.ctrl && keyInput === "e") {
			setCursorPosition(input.length);
			return;
		}

		// Determine new input value based on key input
		let newInput: string | null = null;
		let newCursorPosition: number | null = null;

		// Handle Ctrl+U or Cmd+K to clear entire input (common terminal shortcuts)
		if ((key.ctrl && keyInput === "u") || (key.meta && keyInput === "k")) {
			newInput = "";
			newCursorPosition = 0;
		}
		// Handle backspace - delete character before cursor
		// Note: key.delete is used for backspace behavior due to terminal key mapping
		else if (key.delete) {
			if (cursorPosition > 0) {
				newInput =
					input.slice(0, cursorPosition - 1) +
					input.slice(cursorPosition);
				newCursorPosition = cursorPosition - 1;
			}
		}
		// Handle delete - delete character after cursor
		// Note: key.backspace is used for delete behavior due to terminal key mapping
		else if (key.backspace) {
			if (cursorPosition < input.length) {
				newInput =
					input.slice(0, cursorPosition) +
					input.slice(cursorPosition + 1);
				newCursorPosition = cursorPosition;
			}
		}
		// Handle regular character input - insert at cursor position
		else if (keyInput && !key.ctrl && !key.meta) {
			newInput =
				input.slice(0, cursorPosition) +
				keyInput +
				input.slice(cursorPosition);
			newCursorPosition = cursorPosition + 1;
		}

		// Update input if there's a change
		if (newInput !== null) {
			setInput(newInput);
			setError(null);
			config.onInput?.(newInput);
		}

		// Update cursor position if specified
		if (newCursorPosition !== null) {
			setCursorPosition(newCursorPosition);
		}
	});

	// Update input state when value prop changes (for new fields)
	useEffect(() => {
		const newInput = value || config.initialValue || "";
		setInput(newInput);
		setCursorPosition(newInput.length);
	}, [value, config.initialValue]);

	// Render message - either as markdown or plain text
	const renderMessage = () => {
		if (!config.message) return null;

		if (isMarkdownString(config.message)) {
			const elements = parseMarkdown(
				config.message.content,
				config.message.theme
			);
			return (
				<Box flexDirection="column">
					{elements.map((element, index) => (
						<Box key={index}>{element}</Box>
					))}
					{config.required && <InkText color="red"> *</InkText>}
				</Box>
			);
		}

		return (
			<InkText>
				{config.message}
				{config.required && <InkText color="red"> *</InkText>}
			</InkText>
		);
	};

	return (
		<Box flexDirection="column">
			{renderMessage()}
			{isActive ? (
				// When active, show either placeholder or input
				input ? (
					<InkText color="cyan">
						{input.slice(0, cursorPosition)}
						{cursorPosition < input.length && (
							<InkText backgroundColor="yellow" color="black">
								{input[cursorPosition]}
							</InkText>
						)}
						{cursorPosition >= input.length && (
							<InkText backgroundColor="yellow" color="black">
								{" "}
							</InkText>
						)}
						{input.slice(
							cursorPosition +
								(cursorPosition < input.length ? 1 : 0)
						)}
					</InkText>
				) : (
					// Show placeholder with cursor when no input
					<InkText color="gray">
						{(config.placeholder || "").slice(0, cursorPosition)}
						{cursorPosition < (config.placeholder || "").length && (
							<InkText backgroundColor="yellow" color="black">
								{(config.placeholder || "")[cursorPosition]}
							</InkText>
						)}
						{cursorPosition >=
							(config.placeholder || "").length && (
							<InkText backgroundColor="yellow" color="black">
								{" "}
							</InkText>
						)}
						{(config.placeholder || "").slice(
							cursorPosition +
								(cursorPosition <
								(config.placeholder || "").length
									? 1
									: 0)
						)}
					</InkText>
				)
			) : (
				// When completed (not active), show the actual value prop
				<InkText color="cyan">{value || ""}</InkText>
			)}
			{error && <InkText color="red">Error: {error}</InkText>}
		</Box>
	);
}
