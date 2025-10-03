import React, { useState, useEffect } from "react";
import { useFieldReset } from "../../hooks/useAutoSubmit.js";
import { Text, Box, useInput } from "ink";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";
import { ValidatorFunction } from "../../types/validation.js";

export interface ConfirmOption {
	value: any;
	label: string;
	color?: string;
	hint?: string;
}

interface ConfirmFieldProps {
	label?: string;
	message?: string; // Alternative to label for compatibility
	shortLabel?: string;
	options?: ConfirmOption[];
	allowLoop?: boolean; // Whether to allow looping when navigating with arrow keys (default: true)
	hintPosition?: "bottom" | "inline" | "side"; // Where to display option hints (default: "inline")
	onSubmit: (
		value:
			| any
			| { __preserveAndBack: boolean; value: any }
			| { __clearGroupAndBack: boolean }
	) => void;
	onBack?: () => void;
	initialValue?: any;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: any;
	disabled?: boolean;
	flow?: "progressive" | "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	onValidate?: ValidatorFunction<any>;
	[key: string]: any; // Allow any additional options
}

export function ConfirmField({
	message,
	label,
	shortLabel,
	options,
	allowLoop = true,
	hintPosition = "inline",
	onSubmit,
	onBack,
	initialValue,
	allowBack = true,
	completed = false,
	completedValue,
	disabled = false,
	flow,
	onNavigate,
	isFirstInGroup = false,
	isLastInGroup = false,
	enableArrowNavigation = false,
	onHintChange,
	isFirstRootPrompt = false,
	onValidate,
	...rest
}: ConfirmFieldProps) {
	// Use label if provided, fallback to message for compatibility
	const displayMessage = label || message || "Confirm?";

	// Default options if none provided (memoized to prevent re-creation)
	const confirmOptions: ConfirmOption[] = React.useMemo(() => {
		if (options) {
			// If custom options are provided, use them as-is
			return options;
		}

		// Default behavior: create options based on initialValue
		const defaultOptions = [
			{ value: true, label: "Yes" },
			{ value: false, label: "No" },
		];

		// If there's an initialValue, make it the second option
		if (initialValue !== undefined) {
			const initialOption = defaultOptions.find(
				(opt) => opt.value === initialValue
			);
			const otherOption = defaultOptions.find(
				(opt) => opt.value !== initialValue
			);

			if (initialOption && otherOption) {
				return [otherOption, initialOption];
			}
		}

		return defaultOptions;
	}, [options, initialValue]);

	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (initialValue !== undefined && !options) {
			// When using default options and there's an initialValue,
			// the initial value becomes the second option (index 1)
			return 1;
		} else if (initialValue !== undefined) {
			// For custom options, find the index normally
			const index = confirmOptions.findIndex(
				(option) => option.value === initialValue
			);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	const [submitted, setSubmitted] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	// Reset submitted state when field becomes active again (not disabled)
	useFieldReset(disabled, submitted, setSubmitted);

	// Update selected index when initialValue changes
	useEffect(() => {
		if (initialValue !== undefined && !options) {
			// When using default options and there's an initialValue,
			// the initial value becomes the second option (index 1)
			setSelectedIndex(1);
		} else if (initialValue !== undefined) {
			// For custom options, find the index normally
			const index = confirmOptions.findIndex(
				(option) => option.value === initialValue
			);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [initialValue, confirmOptions, options]);

	// Helper function to run validation on submission attempt
	const runValidation = async (valueToValidate: any): Promise<boolean> => {
		if (!onValidate || disabled || completed) {
			setValidationError(null);
			return true;
		}

		try {
			const result = await onValidate(valueToValidate);
			setValidationError(result);
			return result === null;
		} catch (error) {
			setValidationError("Validation error occurred");
			return false;
		}
	};

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			// Check if we're using default options (no custom options provided)
			const isUsingDefaultOptions = !options;

			const hintText = (
				<>
					{!isFirstRootPrompt && allowBack && (
						<>
							<Text color="yellow">escape</Text> go back
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [disabled, completed, isFirstRootPrompt, options]); // Removed confirmOptions and defaultOptions

	useInput(async (input, key) => {
		if (submitted || completed || disabled) return;

		// Handle static group navigation with arrow keys (only if enabled)
		if (flow === "static" && enableArrowNavigation) {
			if (key.downArrow) {
				if (!isLastInGroup) {
					const selectedValue = confirmOptions[selectedIndex].value;
					// Check validation before moving to next field
					const isValid = await runValidation(selectedValue);
					if (!isValid) {
						// Don't move if there's a validation error
						return;
					}
					setSubmitted(true);
					onSubmit(selectedValue);
					return;
				}
				return;
			} else if (key.upArrow) {
				if (!isFirstInGroup) {
					const selectedValue = confirmOptions[selectedIndex].value;
					// Check validation before navigating up
					const isValid = await runValidation(selectedValue);
					if (!isValid) {
						// Don't navigate if there's a validation error
						return;
					}
					setSubmitted(true);
					onSubmit({
						__preserveAndBack: true,
						value: selectedValue,
					});
				}
				return;
			}
		}

		// Handle escape key for static groups
		if (flow === "static" && key.escape) {
			if (enableArrowNavigation && !isFirstInGroup) {
				const selectedValue = confirmOptions[selectedIndex].value;
				// Check validation before navigating up with escape
				const isValid = await runValidation(selectedValue);
				if (!isValid) {
					// Don't navigate if there's a validation error
					return;
				}
				setSubmitted(true);
				onSubmit({ __preserveAndBack: true, value: selectedValue });
			} else if (enableArrowNavigation && isFirstInGroup) {
				setSubmitted(true);
				onSubmit({ __clearGroupAndBack: true });
			} else {
				if (allowBack && onBack) {
					onBack();
				}
			}
			return;
		}

		if (key.return) {
			const selectedValue = confirmOptions[selectedIndex].value;
			// Check validation before submitting
			const isValid = await runValidation(selectedValue);
			if (!isValid) {
				// Don't submit if there's a validation error
				return;
			}
			setSubmitted(true);
			onSubmit(selectedValue);
			return;
		}

		if (key.escape && flow !== "static") {
			if (allowBack && onBack) {
				onBack();
			}
			return;
		}

		// Handle Y/N keys only for default Yes/No options
		if (
			!options && // Using default options
			(input.toLowerCase() === "y" || input.toLowerCase() === "n")
		) {
			const newValue = input.toLowerCase() === "y";
			const newIndex = confirmOptions.findIndex(
				(option) => option.value === newValue
			);
			setSelectedIndex(newIndex);
			// Check validation before submitting with Y/N shortcut
			const isValid = await runValidation(newValue);
			if (!isValid) {
				// Don't submit if there's a validation error
				return;
			}
			setSubmitted(true);
			onSubmit(newValue);
			return;
		}

		// Arrow key navigation for options
		if (key.leftArrow || key.upArrow) {
			const newIndex = allowLoop
				? selectedIndex > 0
					? selectedIndex - 1
					: confirmOptions.length - 1
				: Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			return;
		}

		if (key.rightArrow || key.downArrow) {
			const newIndex = allowLoop
				? selectedIndex < confirmOptions.length - 1
					? selectedIndex + 1
					: 0
				: Math.min(confirmOptions.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			return;
		}
	});

	// Render message - either as markdown or plain text
	const renderMessage = () => {
		if (!displayMessage) return null;

		if (isMarkdownString(displayMessage)) {
			const elements = parseMarkdown(
				displayMessage.content,
				displayMessage.theme
			);
			return (
				<Box flexDirection="column">
					{elements.map((element, index) => (
						<Box key={index}>{element}</Box>
					))}
				</Box>
			);
		}

		return <Text>{displayMessage}</Text>;
	};

	// Show completed state
	if (completed) {
		const displayValue =
			completedValue !== undefined
				? completedValue
				: confirmOptions[selectedIndex]?.value;

		// Find the option that matches the completed value
		const completedOption = confirmOptions.find(
			(option) => option.value === displayValue
		);
		const displayLabel = completedOption
			? completedOption.label
			: String(displayValue);

		return (
			<Box flexDirection="column">
				<Text>{shortLabel || label}</Text>
				<Text>
					<Text color="blue">{displayLabel}</Text>
				</Text>
			</Box>
		);
	}

	// Show disabled state
	if (disabled) {
		return (
			<Box flexDirection="column">
				<Text dimColor>{label}</Text>
				<Text dimColor>
					<Text color="gray">...</Text>
				</Text>
			</Box>
		);
	}

	// Active state - show options
	return (
		<Box flexDirection="column">
			{renderMessage()}
			{hintPosition === "side" ? (
				// Side layout - two columns, hint only for selected option
				<Box flexDirection="row">
					<Box flexDirection="column" width={25}>
						{confirmOptions.map((option, index) => (
							<Text
								key={String(option.value)}
								color={
									index === selectedIndex
										? "cyan"
										: option.color || "gray"
								}
							>
								{index === selectedIndex ? "●" : "○"}{" "}
								{option.label}
							</Text>
						))}
					</Box>
					<Box flexDirection="column" flexGrow={1}>
						{confirmOptions.map((option, index) => (
							<Text key={String(option.value)} color="gray">
								{index === selectedIndex && option.hint
									? option.hint
									: ""}
							</Text>
						))}
					</Box>
				</Box>
			) : (
				// Original horizontal layout for inline and bottom
				<Box flexDirection="row" gap={2}>
					{confirmOptions.map((option, index) => (
						<Box key={String(option.value)} flexDirection="row">
							<Text
								color={
									index === selectedIndex
										? "cyan"
										: option.color || "gray"
								}
							>
								{index === selectedIndex ? "●" : "○"}{" "}
								{option.label}
							</Text>
							{hintPosition === "inline" &&
								index === selectedIndex &&
								option.hint && (
									<Text color="gray" dimColor>
										{" "}
										{option.hint}
									</Text>
								)}
						</Box>
					))}
				</Box>
			)}
			{hintPosition === "bottom" &&
				(() => {
					const selectedOption = confirmOptions[selectedIndex];
					return selectedOption?.hint ? (
						<Box marginTop={1}>
							<Text color="gray" dimColor>
								{selectedOption.hint}
							</Text>
						</Box>
					) : null;
				})()}
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
}
