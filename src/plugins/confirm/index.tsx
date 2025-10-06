import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../core/registry.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

export interface ConfirmOption {
	value: any;
	label: string;
	color?: string;
	hint?: string;
}

/**
 * User-provided options for the confirm plugin
 */
export interface ConfirmOptions {
	label?: string;
	message?: string;
	shortLabel?: string;
	options?: ConfirmOption[];
	allowLoop?: boolean;
	hintPosition?: "bottom" | "inline" | "side";
	initialValue?: any;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// id?, excludeFromCompleted?, hideAfterSubmit?, allowBack?, onValidate?, meta?
}

// Enhanced confirm input plugin with custom options support
export const confirm = createPlugin<ConfirmOptions, any>({
	type: "confirm",
	interactive: true,

	render: ({ node, options: opts, events }) => {
		// Use label if provided, fallback to message for compatibility
		const displayMessage = opts.label || opts.message || "Confirm?";

		// Default options if none provided (memoized to prevent re-creation)
		const confirmOptions: ConfirmOption[] = React.useMemo(() => {
			if (opts.options) {
				// If custom options are provided, use them as-is
				return opts.options;
			}

			// Default behavior: create options based on initialValue
			const defaultOptions = [
				{ value: true, label: "Yes" },
				{ value: false, label: "No" },
			];

			// If there's an initialValue, make it the second option
			if (opts.initialValue !== undefined) {
				const initialOption = defaultOptions.find(
					(opt) => opt.value === opts.initialValue
				);
				const otherOption = defaultOptions.find(
					(opt) => opt.value !== opts.initialValue
				);

				if (initialOption && otherOption) {
					return [otherOption, initialOption];
				}
			}

			return defaultOptions;
		}, [opts.options, opts.initialValue]);

		const [selectedIndex, setSelectedIndex] = useState(() => {
			if (opts.initialValue !== undefined && !opts.options) {
				// When using default options and there's an initialValue,
				// the initial value becomes the second option (index 1)
				return 1;
			} else if (opts.initialValue !== undefined) {
				// For custom options, find the index normally
				const index = confirmOptions.findIndex(
					(option) => option.value === opts.initialValue
				);
				return index >= 0 ? index : 0;
			}
			return 0;
		});

		const [submitted, setSubmitted] = useState(false);
		const [validationError, setValidationError] = useState<string | null>(
			null
		);

		const disabled = node.state === "disabled";
		useFieldReset(disabled, submitted, setSubmitted);

		useEffect(() => {
			if (opts.initialValue === undefined) return;
			const index = !opts.options
				? 1
				: confirmOptions.findIndex(
						(opt) => opt.value === opts.initialValue
				  );
			if (index >= 0) setSelectedIndex(index);
		}, [opts.initialValue, confirmOptions, opts.options]);

		const runValidation = async (val: any): Promise<boolean> => {
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

				// Static group navigation
				if (node.flow === "static" && node.enableArrowNavigation) {
					const val = confirmOptions[selectedIndex].value;
					if (key.downArrow && !node.isLastInGroup) {
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						events.onSubmit?.(val);
						return;
					}
					if (key.upArrow && !node.isFirstInGroup) {
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						events.onSubmit?.({
							__preserveAndBack: true,
							value: val,
						});
						return;
					}
					if (key.downArrow || key.upArrow) return;
				}

				// Escape for static groups
				if (node.flow === "static" && key.escape) {
					const val = confirmOptions[selectedIndex].value;
					if (node.enableArrowNavigation && !node.isFirstInGroup) {
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						events.onSubmit?.({
							__preserveAndBack: true,
							value: val,
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
					return;
				}

				if (key.return) {
					const val = confirmOptions[selectedIndex].value;
					if (!(await runValidation(val))) return;
					setSubmitted(true);
					events.onSubmit?.(val);
					return;
				}

				if (
					key.escape &&
					node.flow !== "static" &&
					node.allowBack &&
					events.onBack
				) {
					events.onBack();
					return;
				}

				// Y/N shortcuts for default options
				if (
					!opts.options &&
					(input.toLowerCase() === "y" || input.toLowerCase() === "n")
				) {
					const val = input.toLowerCase() === "y";
					const idx = confirmOptions.findIndex(
						(opt) => opt.value === val
					);
					setSelectedIndex(idx);
					if (!(await runValidation(val))) return;
					setSubmitted(true);
					events.onSubmit?.(val);
					return;
				}

				// Arrow navigation
				if (key.leftArrow || key.upArrow) {
					setSelectedIndex(
						opts.allowLoop ?? true
							? selectedIndex > 0
								? selectedIndex - 1
								: confirmOptions.length - 1
							: Math.max(0, selectedIndex - 1)
					);
					return;
				}
				if (key.rightArrow || key.downArrow) {
					setSelectedIndex(
						opts.allowLoop ?? true
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
			{ isActive: node.state === "active" && !submitted }
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

		if (node.state === "completed") {
			const val =
				node.completedValue !== undefined
					? node.completedValue
					: confirmOptions[selectedIndex]?.value;
			const opt = confirmOptions.find((o) => o.value === val);
			return (
				<Box flexDirection="column">
					<Text>{opts.shortLabel || opts.label}</Text>
					<Text color="blue">{opt ? opt.label : String(val)}</Text>
				</Box>
			);
		}

		if (node.state === "disabled") {
			return (
				<Box flexDirection="column">
					<Text dimColor>{opts.label}</Text>
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
				{opts.hintPosition === "side" ? (
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
								{opts.hintPosition === "inline" &&
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
				{opts.hintPosition === "bottom" &&
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
	},
});
