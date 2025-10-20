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
interface HistoryEntry {
	value: string;
	cursorPosition: number;
}

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

	// Undo/redo history
	const history = useRef<HistoryEntry[]>([]);
	const historyIndex = useRef(-1);
	const isUndoRedoAction = useRef(false);
	const lastSavedValue = useRef(value);
	const lastSavedCursor = useRef(value.length);
	const isTypingWord = useRef(false); // Track if user is actively typing a word
	const wordStartCursor = useRef(value.length); // Track cursor position when word typing started
	const lastWasSpace = useRef(false); // Track if last character typed was a space
	const textAfterWordStart = useRef(""); // Track text after cursor when word typing started

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

	// Add current state to history (called at word boundaries)
	const pushToHistory = (overrideCursor?: number) => {
		const cursorToSave =
			overrideCursor !== undefined ? overrideCursor : cursorPosition;
		const currentState = { value, cursorPosition: cursorToSave };

		// Check if this is actually a new state worth saving
		if (
			lastSavedValue.current === currentState.value &&
			lastSavedCursor.current === currentState.cursorPosition
		) {
			return;
		}

		// Remove any future history if we're not at the end
		history.current = history.current.slice(0, historyIndex.current + 1);

		// Add new state
		history.current.push(currentState);
		historyIndex.current++;

		// Update last saved refs
		lastSavedValue.current = currentState.value;
		lastSavedCursor.current = currentState.cursorPosition;

		// Limit history to last 50 entries
		if (history.current.length > 50) {
			history.current.shift();
			historyIndex.current--;
		}

		// Reset typing state
		isTypingWord.current = false;
	};

	// Save word to history when finishing a word (called at boundaries)
	const saveCurrentWord = () => {
		if (isTypingWord.current) {
			pushToHistory();
		}
	};

	// Initialize history with the initial value on mount
	useEffect(() => {
		if (history.current.length === 0) {
			const initialState = { value, cursorPosition };
			history.current.push(initialState);
			historyIndex.current = 0;
			lastSavedValue.current = value;
			lastSavedCursor.current = cursorPosition;
		}
	}, []); // Run once on mount

	// Undo last change
	const undo = () => {
		// First, save the current word if we're typing one
		if (isTypingWord.current && historyIndex.current >= 0) {
			// Save current state WITH the word first (if not already saved)
			if (
				lastSavedValue.current !== value ||
				lastSavedCursor.current !== cursorPosition
			) {
				history.current = history.current.slice(
					0,
					historyIndex.current + 1
				);
				history.current.push({
					value: value,
					cursorPosition: cursorPosition,
				});
				historyIndex.current++;
			}

			// Then undo by one step (which goes back to state before typing the word)
			if (historyIndex.current > 0) {
				historyIndex.current--;
				const prevState = history.current[historyIndex.current];
				isUndoRedoAction.current = true;
				isInternalChange.current = true;
				lastSavedValue.current = prevState.value;
				lastSavedCursor.current = prevState.cursorPosition;
				onChange(prevState.value);
				setCursorPosition(prevState.cursorPosition);
			}

			isTypingWord.current = false;
			textAfterWordStart.current = ""; // Reset
			return; // Don't continue to regular undo
		}

		// Now undo
		if (historyIndex.current > 0) {
			historyIndex.current--;
			const prevState = history.current[historyIndex.current];
			isUndoRedoAction.current = true;
			isInternalChange.current = true;
			lastSavedValue.current = prevState.value;
			lastSavedCursor.current = prevState.cursorPosition;
			onChange(prevState.value);
			setCursorPosition(prevState.cursorPosition);
		}
	};

	// Redo last undone change
	const redo = () => {
		if (historyIndex.current < history.current.length - 1) {
			historyIndex.current++;
			const nextState = history.current[historyIndex.current];
			isUndoRedoAction.current = true;
			isInternalChange.current = true;
			lastSavedValue.current = nextState.value;
			lastSavedCursor.current = nextState.cursorPosition;
			onChange(nextState.value);
			setCursorPosition(nextState.cursorPosition);
		}
	};

	// Sync internal cursor position when value changes externally
	// but NOT when we make internal changes
	useEffect(() => {
		if (externalCursorPosition === undefined && !isInternalChange.current) {
			setInternalCursorPosition(value.length);
		}
		// Reset the flags after each render
		isInternalChange.current = false;
		isUndoRedoAction.current = false;
	}, [value, externalCursorPosition]);

	useInput(
		(input, key) => {
			// Undo: Ctrl+Z (Windows) or Cmd+Z (Mac)
			if (
				(key.ctrl && !key.meta && input === "z" && !key.shift) ||
				(key.meta && !key.shift && (input === "z" || input === ""))
			) {
				undo();
				return;
			}

			// Redo: Ctrl+Y (Windows) or Cmd+Shift+Z (Mac)
			if (
				(key.ctrl && !key.meta && input === "y") ||
				(key.meta && key.shift && (input === "z" || input === ""))
			) {
				redo();
				return;
			}

			// Keyboard shortcuts
			// Ctrl+U: Clear from beginning to cursor (Unix-style)
			if (key.ctrl && input === "u") {
				saveCurrentWord(); // Save current word before clearing
				isInternalChange.current = true;
				onChange(value.slice(cursorPosition));
				setCursorPosition(0);
				pushToHistory(); // Save the cleared state
				return;
			}
			// Ctrl+K (or Meta+K): Clear from cursor to end
			if ((key.ctrl && input === "k") || (key.meta && input === "k")) {
				saveCurrentWord(); // Save current word before clearing
				isInternalChange.current = true;
				onChange(value.slice(0, cursorPosition));
				setCursorPosition(cursorPosition);
				pushToHistory(); // Save the cleared state
				return;
			}
			if (key.ctrl && input === "a") {
				saveCurrentWord(); // Save current word before cursor movement
				const newPos = 0;
				setCursorPosition(newPos);
				wordStartCursor.current = newPos; // Update word start for next typing
				lastWasSpace.current = false; // Reset space tracking
				return;
			}
			if (key.ctrl && input === "e") {
				saveCurrentWord(); // Save current word before cursor movement
				const newPos = value.length;
				setCursorPosition(newPos);
				wordStartCursor.current = newPos; // Update word start for next typing
				lastWasSpace.current = false; // Reset space tracking
				return;
			}

			// Cursor movement with arrows (if not disabled)
			if (!disableArrowKeys) {
				if (key.leftArrow) {
					saveCurrentWord(); // Save word before cursor movement
					const newPos = Math.max(0, cursorPosition - 1);
					setCursorPosition(newPos);
					wordStartCursor.current = newPos; // Update word start for next typing
					lastWasSpace.current = false; // Reset space tracking
					return;
				}
				if (key.rightArrow) {
					saveCurrentWord(); // Save word before cursor movement
					const newPos = Math.min(value.length, cursorPosition + 1);
					setCursorPosition(newPos);
					wordStartCursor.current = newPos; // Update word start for next typing
					lastWasSpace.current = false; // Reset space tracking
					return;
				}
			}

			// Arrow navigation callbacks
			if (key.upArrow && onUpArrow) {
				saveCurrentWord(); // Save word before navigation
				onUpArrow();
				return;
			}
			if (key.downArrow && onDownArrow) {
				saveCurrentWord(); // Save word before navigation
				onDownArrow();
				return;
			}

			// Escape handling
			if (key.escape && onEscape) {
				saveCurrentWord(); // Save word before escape
				onEscape();
				return;
			}

			// Submit on return
			if (key.return && onSubmit) {
				saveCurrentWord(); // Save word before submit
				onSubmit(value);
				return;
			}

			// Backspace/delete
			if (key.backspace || key.delete || input === "\b") {
				if (cursorPosition > 0) {
					// If we were typing a word, this backspace ends it
					saveCurrentWord();

					isInternalChange.current = true;
					onChange(
						value.slice(0, cursorPosition - 1) +
							value.slice(cursorPosition)
					);
					setCursorPosition(cursorPosition - 1);
					pushToHistory(); // Each backspace is its own history entry
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
				// Check if this is a space - word boundary
				if (input === " ") {
					// Save current word before adding space (if we were typing)
					if (isTypingWord.current) {
						// First save state WITHOUT the word but WITH text after (for undo of the word)
						const textBeforeWord = value.slice(
							0,
							wordStartCursor.current
						);
						const restoredValue =
							textBeforeWord + textAfterWordStart.current;
						if (
							lastSavedValue.current !== restoredValue ||
							lastSavedCursor.current !== wordStartCursor.current
						) {
							history.current = history.current.slice(
								0,
								historyIndex.current + 1
							);
							history.current.push({
								value: restoredValue,
								cursorPosition: wordStartCursor.current,
							});
							historyIndex.current++;
							lastSavedValue.current = restoredValue;
							lastSavedCursor.current = wordStartCursor.current;
						}

						// Then save state WITH the word but WITHOUT the space
						if (
							lastSavedValue.current !== value ||
							lastSavedCursor.current !== cursorPosition
						) {
							history.current = history.current.slice(
								0,
								historyIndex.current + 1
							);
							history.current.push({
								value: value,
								cursorPosition: cursorPosition,
							});
							historyIndex.current++;
							lastSavedValue.current = value;
							lastSavedCursor.current = cursorPosition;
						}
						isTypingWord.current = false;
						// Don't reset textAfterWordStart here - keep it for the next word if typing in middle
					}

					// If last character was also a space, save current state before adding another
					// This makes each extra space its own undo point
					if (lastWasSpace.current) {
						if (
							lastSavedValue.current !== value ||
							lastSavedCursor.current !== cursorPosition
						) {
							history.current = history.current.slice(
								0,
								historyIndex.current + 1
							);
							history.current.push({
								value: value,
								cursorPosition: cursorPosition,
							});
							historyIndex.current++;
							lastSavedValue.current = value;
							lastSavedCursor.current = cursorPosition;
						}
					}

					// Add the space
					isInternalChange.current = true;
					const newValue =
						value.slice(0, cursorPosition) +
						input +
						value.slice(cursorPosition);
					const newCursor = cursorPosition + 1;
					onChange(newValue);
					setCursorPosition(newCursor);

					// Track that we just typed a space
					lastWasSpace.current = true;
					wordStartCursor.current = newCursor; // Update for next word

					// Update textAfterWordStart if we're in the middle of text
					// Keep what comes after the new cursor position
					if (newCursor < newValue.length) {
						textAfterWordStart.current = newValue.slice(newCursor);
					} else {
						textAfterWordStart.current = ""; // At end of text
					}
				} else {
					// Regular character - track start of word if just starting
					if (!isTypingWord.current) {
						// Only include space before cursor if we JUST typed it (lastWasSpace)
						// Otherwise, the space was already there and shouldn't be part of the undo
						if (
							lastWasSpace.current &&
							cursorPosition > 0 &&
							value[cursorPosition - 1] === " "
						) {
							// We just typed a space - set wordStartCursor to include it
							wordStartCursor.current = cursorPosition - 1;
							// Update textAfterWordStart to what's after cursor NOW
							textAfterWordStart.current =
								value.slice(cursorPosition);
						} else {
							// No space we just typed - save current state and start tracking word
							if (
								lastSavedValue.current !== value ||
								lastSavedCursor.current !== cursorPosition
							) {
								history.current = history.current.slice(
									0,
									historyIndex.current + 1
								);
								history.current.push({
									value: value,
									cursorPosition: cursorPosition,
								});
								historyIndex.current++;
								lastSavedValue.current = value;
								lastSavedCursor.current = cursorPosition;
							}
							wordStartCursor.current = cursorPosition;
							// Save text that comes after cursor (for undoing insertions in middle)
							textAfterWordStart.current =
								value.slice(cursorPosition);
						}
						isTypingWord.current = true;
					}

					// Not a space anymore
					lastWasSpace.current = false;

					isInternalChange.current = true;
					onChange(
						value.slice(0, cursorPosition) +
							input +
							value.slice(cursorPosition)
					);
					setCursorPosition(cursorPosition + 1);
				}
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
