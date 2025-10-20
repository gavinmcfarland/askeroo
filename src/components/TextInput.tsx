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
		// Save the text WITHOUT the word we're currently typing
		if (isTypingWord.current && historyIndex.current >= 0) {
			// wordStartCursor already points to the right position (including any space to remove)
			const textBeforeWord = value.slice(0, wordStartCursor.current);
			const currentState = {
				value: textBeforeWord,
				cursorPosition: wordStartCursor.current,
			};

			// Check if this state is different from what we're about to undo to
			const stateToUndoTo =
				historyIndex.current > 0
					? history.current[historyIndex.current - 1]
					: history.current[0];
			const isDifferentFromUndoTarget =
				currentState.value !== stateToUndoTo.value ||
				currentState.cursorPosition !== stateToUndoTo.cursorPosition;

			// Only save if it's different from the last saved AND different from what we're undoing to
			if (
				isDifferentFromUndoTarget &&
				(lastSavedValue.current !== currentState.value ||
					lastSavedCursor.current !== currentState.cursorPosition)
			) {
				history.current = history.current.slice(
					0,
					historyIndex.current + 1
				);
				history.current.push(currentState);
				historyIndex.current++;
				lastSavedValue.current = currentState.value;
				lastSavedCursor.current = currentState.cursorPosition;
			}
			isTypingWord.current = false;
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
				// Save state with new cursor position
				pushToHistory(newPos);
				return;
			}
			if (key.ctrl && input === "e") {
				saveCurrentWord(); // Save current word before cursor movement
				const newPos = value.length;
				setCursorPosition(newPos);
				wordStartCursor.current = newPos; // Update word start for next typing
				// Save state with new cursor position
				pushToHistory(newPos);
				return;
			}

			// Cursor movement with arrows (if not disabled)
			if (!disableArrowKeys) {
				if (key.leftArrow) {
					saveCurrentWord(); // Save word before cursor movement
					const newPos = Math.max(0, cursorPosition - 1);
					setCursorPosition(newPos);
					wordStartCursor.current = newPos; // Update word start for next typing
					// Save state with new cursor position for undo
					pushToHistory(newPos);
					return;
				}
				if (key.rightArrow) {
					saveCurrentWord(); // Save word before cursor movement
					const newPos = Math.min(value.length, cursorPosition + 1);
					setCursorPosition(newPos);
					wordStartCursor.current = newPos; // Update word start for next typing
					// Save state with new cursor position for undo
					pushToHistory(newPos);
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
						// First save state WITHOUT the word (for undo of the word)
						const textBeforeWord = value.slice(
							0,
							wordStartCursor.current
						);
						if (
							lastSavedValue.current !== textBeforeWord ||
							lastSavedCursor.current !== wordStartCursor.current
						) {
							history.current = history.current.slice(
								0,
								historyIndex.current + 1
							);
							history.current.push({
								value: textBeforeWord,
								cursorPosition: wordStartCursor.current,
							});
							historyIndex.current++;
							lastSavedValue.current = textBeforeWord;
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

					// Don't save the state with space - it will be saved when next word is typed
					// Don't update lastSaved refs - they should point to the last actual save
					wordStartCursor.current = newCursor; // Update for next word
				} else {
					// Regular character - track start of word if just starting
					if (!isTypingWord.current) {
						// Check if there's a space immediately before cursor
						if (
							cursorPosition > 0 &&
							value[cursorPosition - 1] === " "
						) {
							// Space before cursor - set wordStartCursor to that space
							// DON'T save the state with space - undoing should remove space + word
							wordStartCursor.current = cursorPosition - 1;
						} else {
							// No space before - save current state and start tracking word
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
						}
						isTypingWord.current = true;
					}
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
