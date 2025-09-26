import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

export interface ConfirmOption {
	value: any;
	label: string;
	color?: string;
	hint?: string;
}

interface ConfirmFieldProps {
	message?: string;
	label?: string; // Alternative to message for compatibility
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
	...rest
}: ConfirmFieldProps) {
	// Use label if provided, fallback to message for compatibility
	const displayMessage = label || message || "Confirm?";

	// Default options if none provided (memoized to prevent re-creation)
	const defaultOptions: ConfirmOption[] = React.useMemo(
		() => [
			{ value: true, label: "Yes" },
			{ value: false, label: "No" },
		],
		[]
	);
	const confirmOptions = options || defaultOptions;

	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (initialValue !== undefined) {
			const index = confirmOptions.findIndex(
				(option) => option.value === initialValue
			);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	const [submitted, setSubmitted] = useState(false);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Update selected index when initialValue changes
	useEffect(() => {
		if (initialValue !== undefined) {
			const index = confirmOptions.findIndex(
				(option) => option.value === initialValue
			);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [initialValue, confirmOptions]);

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			// Check if we're using default options (no custom options provided)
			const isUsingDefaultOptions = !options;

			const hintText = (
				<>
					<Text color="yellow">enter</Text> proceed
					{!isFirstRootPrompt && (
						<>
							, <Text color="yellow">escape</Text> go back
						</>
					)}
					{isUsingDefaultOptions && (
						<>
							, <Text color="yellow">y/n</Text> quick select
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

	useInput((input, key) => {
		if (submitted || completed || disabled) return;

		// Handle static group navigation with arrow keys (only if enabled)
		if (flow === "static" && enableArrowNavigation) {
			if (key.downArrow) {
				if (!isLastInGroup) {
					const selectedValue = confirmOptions[selectedIndex].value;
					setSubmitted(true);
					onSubmit(selectedValue);
					return;
				}
				return;
			} else if (key.upArrow) {
				if (!isFirstInGroup) {
					const selectedValue = confirmOptions[selectedIndex].value;
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
			<Box gap={1}>
				<Box width={14}>
					<Text>{shortLabel || displayMessage}</Text>
				</Box>
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
				<Text dimColor>{displayMessage}</Text>
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
		</Box>
	);
}
