import React, { useState, useEffect, useRef } from "react";
import { Text, useInput } from "ink";

interface TextInputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit?: (value: string) => void;
	cursorPosition?: number;
	onCursorPositionChange?: (position: number) => void;
	isActive: boolean;
	color?: string;
	placeholder?: string;
	onEscape?: () => void;
	onUpArrow?: () => void;
	onDownArrow?: () => void;
	disableArrowKeys?: boolean;
}

/**
 * Shared text input component with cursor management and keyboard shortcuts
 * Used by text prompts and searchable filters in multi/radio prompts
 */
export const TextInput: React.FC<TextInputProps> = ({
	value,
	onChange,
	onSubmit,
	cursorPosition: externalCursorPosition,
	onCursorPositionChange,
	isActive,
	color = "cyan",
	placeholder,
	onEscape,
	onUpArrow,
	onDownArrow,
	disableArrowKeys = false,
}) => {
	// Use internal state if no external cursor position is provided
	const [internalCursorPosition, setInternalCursorPosition] = useState(
		value.length
	);

	// Track whether we're making an internal change to prevent cursor auto-sync
	const isInternalChange = useRef(false);

	const cursorPosition =
		externalCursorPosition !== undefined
			? externalCursorPosition
			: internalCursorPosition;

	const setCursorPosition = (pos: number) => {
		if (onCursorPositionChange) {
			onCursorPositionChange(pos);
		} else {
			setInternalCursorPosition(pos);
		}
	};

	// Sync internal cursor position when value changes externally
	// but NOT when we make internal changes
	useEffect(() => {
		if (externalCursorPosition === undefined && !isInternalChange.current) {
			setInternalCursorPosition(value.length);
		}
		// Reset the flag after each render
		isInternalChange.current = false;
	}, [value, externalCursorPosition]);

	useInput(
		(input, key) => {
			// Keyboard shortcuts
			// Ctrl+U: Clear from beginning to cursor (Unix-style)
			if (key.ctrl && input === "u") {
				isInternalChange.current = true;
				onChange(value.slice(cursorPosition));
				setCursorPosition(0);
				return;
			}
			// Ctrl+K (or Meta+K): Clear from cursor to end
			if ((key.ctrl && input === "k") || (key.meta && input === "k")) {
				isInternalChange.current = true;
				onChange(value.slice(0, cursorPosition));
				setCursorPosition(cursorPosition);
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

			// Cursor movement with arrows (if not disabled)
			if (!disableArrowKeys) {
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

			// Arrow navigation callbacks
			if (key.upArrow && onUpArrow) {
				onUpArrow();
				return;
			}
			if (key.downArrow && onDownArrow) {
				onDownArrow();
				return;
			}

			// Escape handling
			if (key.escape && onEscape) {
				onEscape();
				return;
			}

			// Submit on return
			if (key.return && onSubmit) {
				onSubmit(value);
				return;
			}

			// Backspace/delete
			if (key.backspace || key.delete || input === "\b") {
				if (cursorPosition > 0) {
					isInternalChange.current = true;
					onChange(
						value.slice(0, cursorPosition - 1) +
							value.slice(cursorPosition)
					);
					setCursorPosition(cursorPosition - 1);
				}
				return;
			}

			// Text input
			if (
				input &&
				input.length === 1 &&
				!key.ctrl &&
				!key.meta &&
				!key.return &&
				!key.escape &&
				!key.upArrow &&
				!key.downArrow &&
				!key.leftArrow &&
				!key.rightArrow
			) {
				isInternalChange.current = true;
				onChange(
					value.slice(0, cursorPosition) +
						input +
						value.slice(cursorPosition)
				);
				setCursorPosition(cursorPosition + 1);
				return;
			}
		},
		{ isActive }
	);

	// Render text with cursor
	return (
		<Text color={color}>
			{value.slice(0, cursorPosition)}
			<Text backgroundColor="grey" color="black">
				{cursorPosition < value.length ? value[cursorPosition] : " "}
			</Text>
			{value.slice(
				cursorPosition + (cursorPosition < value.length ? 1 : 0)
			)}
			{value.length === 0 && cursorPosition === 0 && "\u200B"}
		</Text>
	);
};
