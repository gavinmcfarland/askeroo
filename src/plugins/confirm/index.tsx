import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../registry.js";
import { ValidatorFunction } from "../../types/index.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

export interface ConfirmOptions {
	label?: string;
	message?: string; // Alternative to label for compatibility
	shortLabel?: string;
	options?: ConfirmOption[];
	allowLoop?: boolean;
	hintPosition?: "bottom" | "inline" | "side"; // Where to display option hints (default: "inline")
	initialValue?: any;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<any>;
	meta?: Record<string, any>; // User-defined metadata for this field
}

export interface ConfirmOption {
	value: any;
	label: string;
	color?: string;
	hint?: string;
}

// Enhanced confirm input plugin with custom options support
export const confirm = createPlugin<ConfirmOptions, any>({
	type: "confirm",
	interactive: true,

	render: () =>
		function ConfirmField({
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
			state = "active",
			completedValue,
			flow,
			onNavigate,
			isFirstInGroup = false,
			isLastInGroup = false,
			enableArrowNavigation = false,
			onHintChange,
			isFirstRootPrompt = false,
			onValidate,
			...rest
		}: any) {
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
			const [validationError, setValidationError] = useState<
				string | null
			>(null);

			const disabled = state === "disabled";
			useFieldReset(disabled, submitted, setSubmitted);

			useEffect(() => {
				if (initialValue === undefined) return;
				const index = !options
					? 1
					: confirmOptions.findIndex(
							(opt) => opt.value === initialValue
					  );
				if (index >= 0) setSelectedIndex(index);
			}, [initialValue, confirmOptions, options]);

			const runValidation = async (val: any): Promise<boolean> => {
				if (!onValidate || state !== "active") {
					setValidationError(null);
					return true;
				}
				try {
					const result = await onValidate(val);
					setValidationError(result);
					return result === null;
				} catch {
					setValidationError("Validation error occurred");
					return false;
				}
			};

			useEffect(() => {
				if (!onHintChange) return;
				onHintChange(
					state === "active" && !isFirstRootPrompt && allowBack ? (
						<>
							<Text color="yellow">escape</Text> go back
						</>
					) : null
				);
			}, [state, isFirstRootPrompt, allowBack, onHintChange]);

			useInput(
				async (input, key) => {
					if (submitted || state !== "active") return;

					// Static group navigation
					if (flow === "static" && enableArrowNavigation) {
						const val = confirmOptions[selectedIndex].value;
						if (key.downArrow && !isLastInGroup) {
							if (!(await runValidation(val))) return;
							setSubmitted(true);
							onSubmit(val);
							return;
						}
						if (key.upArrow && !isFirstInGroup) {
							if (!(await runValidation(val))) return;
							setSubmitted(true);
							onSubmit({ __preserveAndBack: true, value: val });
							return;
						}
						if (key.downArrow || key.upArrow) return;
					}

					// Escape for static groups
					if (flow === "static" && key.escape) {
						const val = confirmOptions[selectedIndex].value;
						if (enableArrowNavigation && !isFirstInGroup) {
							if (!(await runValidation(val))) return;
							setSubmitted(true);
							onSubmit({ __preserveAndBack: true, value: val });
						} else if (enableArrowNavigation && isFirstInGroup) {
							setSubmitted(true);
							onSubmit({ __clearGroupAndBack: true });
						} else if (allowBack && onBack) {
							onBack();
						}
						return;
					}

					if (key.return) {
						const val = confirmOptions[selectedIndex].value;
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						onSubmit(val);
						return;
					}

					if (
						key.escape &&
						flow !== "static" &&
						allowBack &&
						onBack
					) {
						onBack();
						return;
					}

					// Y/N shortcuts for default options
					if (
						!options &&
						(input.toLowerCase() === "y" ||
							input.toLowerCase() === "n")
					) {
						const val = input.toLowerCase() === "y";
						const idx = confirmOptions.findIndex(
							(opt) => opt.value === val
						);
						setSelectedIndex(idx);
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						onSubmit(val);
						return;
					}

					// Arrow navigation
					if (key.leftArrow || key.upArrow) {
						setSelectedIndex(
							allowLoop
								? selectedIndex > 0
									? selectedIndex - 1
									: confirmOptions.length - 1
								: Math.max(0, selectedIndex - 1)
						);
						return;
					}
					if (key.rightArrow || key.downArrow) {
						setSelectedIndex(
							allowLoop
								? selectedIndex < confirmOptions.length - 1
									? selectedIndex + 1
									: 0
								: Math.min(
										confirmOptions.length - 1,
										selectedIndex + 1
								  )
						);
						return;
					}
				},
				{ isActive: state === "active" && !submitted }
			);

			const renderMessage = () => {
				if (!displayMessage) return null;
				if (isMarkdownString(displayMessage)) {
					return (
						<Box flexDirection="column">
							{parseMarkdown(
								displayMessage.content,
								displayMessage.theme
							).map((el, i) => (
								<Box key={i}>{el}</Box>
							))}
						</Box>
					);
				}
				return <Text>{displayMessage}</Text>;
			};

			if (state === "completed") {
				const val =
					completedValue !== undefined
						? completedValue
						: confirmOptions[selectedIndex]?.value;
				const opt = confirmOptions.find((o) => o.value === val);
				return (
					<Box flexDirection="column">
						<Text>{shortLabel || label}</Text>
						<Text color="blue">
							{opt ? opt.label : String(val)}
						</Text>
					</Box>
				);
			}

			if (state === "disabled") {
				return (
					<Box flexDirection="column">
						<Text dimColor>{label}</Text>
						<Text dimColor color="gray">
							...
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
									<Text
										key={String(option.value)}
										color="gray"
									>
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
								<Box
									key={String(option.value)}
									flexDirection="row"
								>
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
							const selectedOption =
								confirmOptions[selectedIndex];
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
		},

	// The prompt logic - just return the options, runtime handles UI
	prompt(opts: ConfirmOptions, { currentGroup }, id: string) {
		return opts;
	},
});
