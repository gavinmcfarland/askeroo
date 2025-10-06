import React, { useState, useEffect, useMemo, useRef } from "react";
import { Text, Box, useInput } from "ink";
import { PluginComponentProps } from "../../types/index.js";

interface MultiFieldOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

/**
 * User-provided options for the multi-select plugin
 */
export interface MultiOptions {
	label?: string;
	message?: string;
	shortLabel?: string;
	options?: string[] | MultiFieldOption[];
	initialValue?: string[];
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean;
	allowLoop?: boolean;
	searchable?: boolean;
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed";
	maxVisible?: number;
	searchQuery?: string;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// id?, excludeFromCompleted?, hideAfterSubmit?, allowBack?, onValidate?, meta?
}

export const MultiField = ({
	node,
	options: opts,
	events,
}: PluginComponentProps<MultiOptions, string[]>) => {
	// Use label if provided, fallback to message for compatibility
	const label = opts.label || opts.message || "Select";

	const onSearchQueryChange = events.onSearchQueryChange as
		| ((query: string) => void)
		| undefined;
	const NONE_VALUE = "__NONE__";
	// Normalize options to support both string[] and MultiFieldOption[]
	const normalizedOptions: MultiFieldOption[] = useMemo(() => {
		return (opts.options || []).map((option: string | MultiFieldOption) =>
			typeof option === "string"
				? { value: option, label: option }
				: option
		);
	}, [opts.options]);

	const getInitialValues = (): string[] => {
		const vals = Array.isArray(opts.initialValue) ? opts.initialValue : [];
		if (!opts.noneOption) return vals;
		const hasRegular = vals.some((v) => v !== NONE_VALUE);
		return hasRegular
			? vals.filter((v) => v !== NONE_VALUE)
			: vals.length === 0
			? [NONE_VALUE]
			: vals;
	};

	const [selectedValues, setSelectedValues] = useState<string[]>(
		getInitialValues()
	);
	const [validationError, setValidationError] = useState<string | null>(null);

	const [internalSearchQuery, setInternalSearchQuery] = useState("");

	const filteredOptions = useMemo(() => {
		if (!opts.searchable || !internalSearchQuery.trim())
			return normalizedOptions;
		const q = internalSearchQuery.toLowerCase();
		return normalizedOptions.filter((opt) => {
			const isSelected = selectedValues.includes(opt.value);
			const matches =
				opt.label.toLowerCase().includes(q) ||
				opt.value.toLowerCase().includes(q);
			return isSelected || matches;
		});
	}, [
		normalizedOptions,
		opts.searchable,
		internalSearchQuery,
		selectedValues,
	]);

	const totalOptions = filteredOptions.length + (opts.noneOption ? 1 : 0);

	// Simple navigation state
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Track current window position for edge-scrolling
	const [windowStart, setWindowStart] = useState(0);

	const navigateUp = () => {
		const newIndex =
			opts.allowLoop ?? true
				? selectedIndex > 0
					? selectedIndex - 1
					: totalOptions - 1
				: Math.max(0, selectedIndex - 1);
		setSelectedIndex(newIndex);
	};

	const navigateDown = () => {
		const newIndex =
			opts.allowLoop ?? true
				? selectedIndex < totalOptions - 1
					? selectedIndex + 1
					: 0
				: Math.min(totalOptions - 1, selectedIndex + 1);
		setSelectedIndex(newIndex);
	};
	const [submitted, setSubmitted] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Toggle selection function
	const toggleSelection = (optionValue: string) => {
		const isNoneOption = opts.noneOption && optionValue === NONE_VALUE;
		let newSelectedValues: string[];

		if (isNoneOption) {
			// None option - if not selected, select it; if already selected, do nothing (can't unselect)
			if (!selectedValues.includes(NONE_VALUE)) {
				newSelectedValues = [NONE_VALUE];
			} else {
				// None is already selected, don't allow unselecting it
				return;
			}
		} else {
			// Regular option - if None is selected, clear it first
			const filteredValues = selectedValues.filter(
				(v) => v !== NONE_VALUE
			);
			newSelectedValues = filteredValues.includes(optionValue)
				? filteredValues.filter((v) => v !== optionValue)
				: [...filteredValues, optionValue];
		}

		setSelectedValues(newSelectedValues);
		setError(null);
	};

	// Adjust focus when filtered options change to ensure it stays within bounds
	useEffect(() => {
		const maxIndex = filteredOptions.length + (opts.noneOption ? 1 : 0) - 1;
		if (selectedIndex > maxIndex) {
			setSelectedIndex(Math.max(0, maxIndex));
		}
	}, [filteredOptions.length, opts.noneOption]);

	// Reset window position when options change significantly
	useEffect(() => {
		setWindowStart(0);
	}, [filteredOptions.length, opts.maxVisible]);

	const disabled = node.state === "disabled";
	useEffect(() => {
		if (!disabled && submitted) setSubmitted(false);
	}, [disabled, submitted]);

	// Calculate visible window for options (including none option)
	// Combined list positions: 0=none (if present), 1=first_option, 2=second_option, etc.
	const getVisibleWindow = () => {
		const totalOptions = filteredOptions.length + (opts.noneOption ? 1 : 0);

		if (!opts.maxVisible || totalOptions <= opts.maxVisible) {
			return {
				showNoneOption: !!opts.noneOption,
				visibleOptions: filteredOptions,
				startIndex: 0,
				showStartEllipsis: false,
				showEndEllipsis: false,
			};
		}

		// Calculate visible window - scroll only when at edges
		// The window operates on the combined list (none option + filtered options)
		let currentWindowStart = windowStart;
		let currentWindowEnd = Math.min(
			currentWindowStart + opts.maxVisible,
			totalOptions
		);

		// If selected index is at or beyond the bottom of current window, scroll down
		if (selectedIndex >= currentWindowEnd) {
			currentWindowStart = selectedIndex - opts.maxVisible + 1;
			currentWindowEnd = selectedIndex + 1;
		}
		// If selected index is before the top of current window, scroll up
		else if (selectedIndex < currentWindowStart) {
			currentWindowStart = selectedIndex;
			currentWindowEnd = selectedIndex + opts.maxVisible;
		}

		// Ensure we don't exceed bounds
		currentWindowStart = Math.max(0, currentWindowStart);
		currentWindowEnd = Math.min(totalOptions, currentWindowEnd);

		// Adjust windowStart if we hit the end and have room to show more
		if (
			currentWindowEnd - currentWindowStart < opts.maxVisible &&
			currentWindowStart > 0
		) {
			currentWindowStart = Math.max(
				0,
				currentWindowEnd - opts.maxVisible
			);
		}

		// Update window position state if it changed
		if (currentWindowStart !== windowStart) {
			setWindowStart(currentWindowStart);
		}

		// Determine if none option should be shown (it's at position 0 in combined list)
		const showNoneOption = opts.noneOption && currentWindowStart === 0;

		// Calculate which regular options to show
		// If none option is present, it occupies position 0, so regular options start at position 1
		let optionsStart, optionsEnd;

		if (opts.noneOption) {
			// With none option: positions 0=none, 1=first_option, 2=second_option, etc.
			optionsStart = Math.max(0, currentWindowStart - 1);
			optionsEnd = Math.min(filteredOptions.length, currentWindowEnd - 1);
		} else {
			// Without none option: positions 0=first_option, 1=second_option, etc.
			optionsStart = currentWindowStart;
			optionsEnd = Math.min(filteredOptions.length, currentWindowEnd);
		}

		const visibleOptions = filteredOptions.slice(optionsStart, optionsEnd);
		const showStartEllipsis = currentWindowStart > 0;
		const showEndEllipsis = currentWindowEnd < totalOptions;

		return {
			showNoneOption,
			visibleOptions,
			startIndex: optionsStart,
			showStartEllipsis,
			showEndEllipsis,
		};
	};

	const runValidation = async (vals: string[]): Promise<boolean> => {
		if (!events.onValidate || node.state !== "active") {
			setValidationError(null);
			return true;
		}
		try {
			const result = await events.onValidate(vals);
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
			node.state === "active" ? (
				<>
					{!node.isFirstRootPrompt && node.allowBack && (
						<>
							<Text color="yellow">escape</Text> go back,{" "}
						</>
					)}
					<Text color="yellow">space</Text> select
					{opts.searchable && (
						<>
							, <Text color="yellow">type</Text> to search
						</>
					)}
				</>
			) : null
		);
	}, [
		node.state,
		node.isFirstRootPrompt,
		opts.searchable,
		node.allowBack,
		events.onHintChange,
	]);

	const stableInitial = useMemo(
		() => [...(opts.initialValue || [])],
		[(opts.initialValue || []).join(",")]
	);
	const prevInitialRef = useRef<string[]>([]);

	useEffect(() => {
		if (submitted || disabled) return;
		const changed =
			stableInitial.length !== prevInitialRef.current.length ||
			stableInitial.some((v, i) => v !== prevInitialRef.current[i]);
		if (changed) {
			let vals = [...stableInitial];
			if (opts.noneOption) {
				const hasRegular = vals.some((v) => v !== NONE_VALUE);
				vals = hasRegular
					? vals.filter((v) => v !== NONE_VALUE)
					: vals.length === 0
					? [NONE_VALUE]
					: vals;
			}
			setSelectedValues(vals);
			prevInitialRef.current = [...stableInitial];
		}
	}, [stableInitial, submitted, disabled, opts.noneOption]);

	useInput(
		async (input, key) => {
			if (submitted || node.state !== "active") return;

			// Search input
			if (
				opts.searchable &&
				input &&
				input !== " " &&
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
				setInternalSearchQuery(internalSearchQuery + input);
				return;
			}

			// Escape handling
			if (key.escape) {
				if (opts.searchable && internalSearchQuery.trim()) {
					setInternalSearchQuery("");
					return;
				}
				if (
					opts.noneOption &&
					selectedValues.some((v) => v !== NONE_VALUE)
				) {
					setSelectedValues([NONE_VALUE]);
					setError(null);
					return;
				}
				if (node.allowBack && events.onBack) {
					events.onBack();
					return;
				}
			}

			if (key.return) {
				const vals = selectedValues.filter((v) => v !== NONE_VALUE);
				if (!(await runValidation(vals))) return;
				setSubmitted(true);
				events.onSubmit?.(vals);
				return;
			}

			if (input === " ") {
				const isNone = opts.noneOption && selectedIndex === 0;
				const opt = isNone
					? { value: NONE_VALUE, label: opts.noneOption!.label }
					: filteredOptions[
							selectedIndex - (opts.noneOption ? 1 : 0)
					  ];
				if (opt) toggleSelection(opt.value);
				return;
			}

			if (
				opts.searchable &&
				(key.backspace || key.delete || input === "\b")
			) {
				setInternalSearchQuery(internalSearchQuery.slice(0, -1));
				return;
			}

			if (key.leftArrow) {
				setSelectedIndex(
					selectedIndex > 0 ? selectedIndex - 1 : totalOptions - 1
				);
				return;
			}
			if (key.rightArrow) {
				setSelectedIndex(
					selectedIndex < totalOptions - 1 ? selectedIndex + 1 : 0
				);
				return;
			}
			if (key.upArrow) {
				navigateUp();
				return;
			}
			if (key.downArrow) {
				navigateDown();
				return;
			}

			if (opts.showNumbers) {
				const num = parseInt(input);
				if (!isNaN(num) && num >= 1 && num <= totalOptions) {
					const idx = num - 1;
					setSelectedIndex(idx);
					const isNone = opts.noneOption && idx === 0;
					const opt = isNone
						? { value: NONE_VALUE, label: opts.noneOption!.label }
						: filteredOptions[idx - (opts.noneOption ? 1 : 0)];
					if (opt) toggleSelection(opt.value);
					return;
				}
			}
		},
		{ isActive: node.state === "active" && !submitted }
	);

	if (node.state === "completed") {
		const val =
			(node.completedValue || []).length === 0 && opts.noneOption
				? opts.noneOption.label
				: (node.completedValue || []).join(", ");
		return (
			<Box flexDirection="column">
				<Text>{label}</Text>
				<Text color="blue">{val}</Text>
			</Box>
		);
	}

	if (node.state === "disabled") {
		return (
			<Box flexDirection="row" gap={1}>
				<Text dimColor>{label}</Text>
				<Text dimColor color="gray">
					...
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Text>{label}</Text>
			{opts.hintPosition === "side" ? (
				<Box flexDirection="row">
					<Box flexDirection="column" width={25}>
						{(() => {
							const {
								showNoneOption,
								visibleOptions,
								startIndex,
								showStartEllipsis,
								showEndEllipsis,
							} = getVisibleWindow();
							return (
								<>
									{showStartEllipsis && (
										<Text color="gray">⋯</Text>
									)}
									{showNoneOption && (
										<Text
											color={
												selectedIndex === 0
													? "cyan"
													: selectedValues.includes(
															NONE_VALUE
													  )
													? "white"
													: "gray"
											}
										>
											{selectedValues.includes(NONE_VALUE)
												? "■"
												: "□"}{" "}
											{opts.showNumbers && "1. "}
											{opts.noneOption!.label}
										</Text>
									)}
									{visibleOptions.map(
										(option, visibleIndex) => {
											const actualIndex =
												startIndex + visibleIndex;
											const displayIndex =
												actualIndex +
												(opts.noneOption ? 2 : 1);
											const optionIndex =
												actualIndex +
												(opts.noneOption ? 1 : 0);
											const isSelected =
												selectedValues.includes(
													option.value
												);
											const isFocused =
												optionIndex === selectedIndex;
											const color = isFocused
												? "cyan"
												: isSelected
												? "white"
												: option.color || "gray";

											// Highlight matching text if searching
											const renderLabel = () => {
												if (
													!opts.searchable ||
													!internalSearchQuery.trim()
												) {
													return option.label;
												}

												const query =
													internalSearchQuery.toLowerCase();
												const label = option.label;
												const lowerLabel =
													label.toLowerCase();
												const matchIndex =
													lowerLabel.indexOf(query);

												if (matchIndex === -1) {
													return label; // No match found, return original
												}

												const beforeMatch = label.slice(
													0,
													matchIndex
												);
												const match = label.slice(
													matchIndex,
													matchIndex + query.length
												);
												const afterMatch = label.slice(
													matchIndex + query.length
												);

												// Use cyan for focused items, option color or white for non-focused
												const highlightColor = isFocused
													? "cyan"
													: option.color || "white";

												return (
													<>
														{beforeMatch}
														<Text
															underline
															color={
																highlightColor
															}
														>
															{match}
														</Text>
														{afterMatch}
													</>
												);
											};

											return (
												<Text
													key={option.value}
													color={color}
												>
													{isSelected ? "■" : "□"}{" "}
													{opts.showNumbers &&
														`${displayIndex}. `}
													{renderLabel()}
												</Text>
											);
										}
									)}
									{showEndEllipsis && (
										<Text color="gray">⋯</Text>
									)}
								</>
							);
						})()}
					</Box>
					<Box flexDirection="column" flexGrow={1}>
						{(() => {
							const {
								showNoneOption,
								visibleOptions,
								startIndex,
								showStartEllipsis,
								showEndEllipsis,
							} = getVisibleWindow();
							return (
								<>
									{showStartEllipsis && (
										<Text color="gray"></Text>
									)}
									{showNoneOption && (
										<Text color="gray">
											{/* Placeholder for noneOption - no hint support */}
										</Text>
									)}
									{visibleOptions.map(
										(option, visibleIndex) => {
											const actualIndex =
												startIndex + visibleIndex;
											const optionIndex =
												actualIndex +
												(opts.noneOption ? 1 : 0);
											const isFocused =
												optionIndex === selectedIndex;
											return (
												<Text
													key={option.value}
													color="gray"
												>
													{isFocused && option.hint
														? option.hint
														: ""}
												</Text>
											);
										}
									)}
									{showEndEllipsis && (
										<Text color="gray"></Text>
									)}
								</>
							);
						})()}
					</Box>
				</Box>
			) : opts.hintPosition === "inline-fixed" ? (
				(() => {
					const {
						showNoneOption,
						visibleOptions,
						startIndex,
						showStartEllipsis,
						showEndEllipsis,
					} = getVisibleWindow();
					return (
						<>
							{showStartEllipsis && <Text color="gray">⋯</Text>}
							{showNoneOption && (
								<Box flexDirection="row">
									<Box width={25}>
										<Text
											color={
												selectedIndex === 0
													? "cyan"
													: selectedValues.includes(
															NONE_VALUE
													  )
													? "white"
													: "gray"
											}
										>
											{selectedValues.includes(NONE_VALUE)
												? "■"
												: "□"}{" "}
											{opts.showNumbers && "1. "}
											{opts.noneOption!.label}
										</Text>
									</Box>
									<Box flexGrow={1}>
										<Text color="gray">
											{/* None option doesn't have hints */}
										</Text>
									</Box>
								</Box>
							)}
							{visibleOptions.map((option, visibleIndex) => {
								const actualIndex = startIndex + visibleIndex;
								const displayIndex =
									actualIndex + (opts.noneOption ? 2 : 1);
								const optionIndex =
									actualIndex + (opts.noneOption ? 1 : 0);
								const isSelected = selectedValues.includes(
									option.value
								);
								const isFocused = optionIndex === selectedIndex;
								const color = isFocused
									? "cyan"
									: isSelected
									? "white"
									: option.color || "gray";

								// Highlight matching text if searching
								const renderLabel = () => {
									if (
										!opts.searchable ||
										!internalSearchQuery.trim()
									) {
										return option.label;
									}

									const query =
										internalSearchQuery.toLowerCase();
									const label = option.label;
									const lowerLabel = label.toLowerCase();
									const matchIndex =
										lowerLabel.indexOf(query);

									if (matchIndex === -1) {
										return label; // No match found, return original
									}

									const beforeMatch = label.slice(
										0,
										matchIndex
									);
									const match = label.slice(
										matchIndex,
										matchIndex + query.length
									);
									const afterMatch = label.slice(
										matchIndex + query.length
									);

									// Use cyan for focused items, option color or white for non-focused
									const highlightColor = isFocused
										? "cyan"
										: option.color || "white";

									return (
										<>
											{beforeMatch}
											<Text
												underline
												color={highlightColor}
											>
												{match}
											</Text>
											{afterMatch}
										</>
									);
								};

								return (
									<Box key={option.value} flexDirection="row">
										<Box width={25}>
											<Text color={color}>
												{isSelected ? "■" : "□"}{" "}
												{opts.showNumbers &&
													`${displayIndex}. `}
												{renderLabel()}
											</Text>
										</Box>
										<Box flexGrow={1}>
											<Text color="gray">
												{isFocused && option.hint
													? option.hint
													: ""}
											</Text>
										</Box>
									</Box>
								);
							})}
							{showEndEllipsis && <Text color="gray">⋯</Text>}
						</>
					);
				})()
			) : (
				(() => {
					const {
						showNoneOption,
						visibleOptions,
						startIndex,
						showStartEllipsis,
						showEndEllipsis,
					} = getVisibleWindow();
					return (
						<>
							{showStartEllipsis && <Text color="gray">⋯</Text>}
							{showNoneOption && (
								<Text
									color={
										selectedIndex === 0
											? "cyan"
											: selectedValues.includes(
													NONE_VALUE
											  )
											? "white"
											: "gray"
									}
								>
									{selectedValues.includes(NONE_VALUE)
										? "■"
										: "□"}{" "}
									{opts.showNumbers && "1. "}
									{opts.noneOption!.label}
								</Text>
							)}
							{visibleOptions.map((option, visibleIndex) => {
								const actualIndex = startIndex + visibleIndex;
								const displayIndex =
									actualIndex + (opts.noneOption ? 2 : 1);
								const optionIndex =
									actualIndex + (opts.noneOption ? 1 : 0);
								const isSelected = selectedValues.includes(
									option.value
								);
								const isFocused = optionIndex === selectedIndex;
								const color = isFocused
									? "cyan"
									: isSelected
									? "white"
									: option.color || "gray";

								// Highlight matching text if searching
								const renderLabel = () => {
									if (
										!opts.searchable ||
										!internalSearchQuery.trim()
									) {
										return option.label;
									}

									const query =
										internalSearchQuery.toLowerCase();
									const label = option.label;
									const lowerLabel = label.toLowerCase();
									const matchIndex =
										lowerLabel.indexOf(query);

									if (matchIndex === -1) {
										return label; // No match found, return original
									}

									const beforeMatch = label.slice(
										0,
										matchIndex
									);
									const match = label.slice(
										matchIndex,
										matchIndex + query.length
									);
									const afterMatch = label.slice(
										matchIndex + query.length
									);

									// Use cyan for focused items, option color or white for non-focused
									const highlightColor = isFocused
										? "cyan"
										: option.color || "white";

									return (
										<>
											{beforeMatch}
											<Text
												underline
												color={highlightColor}
											>
												{match}
											</Text>
											{afterMatch}
										</>
									);
								};

								return (
									<Box key={option.value} flexDirection="row">
										<Text color={color}>
											{isSelected ? "■" : "□"}{" "}
											{opts.showNumbers &&
												`${displayIndex}. `}
											{renderLabel()}
										</Text>
										{opts.hintPosition === "inline" &&
											isFocused &&
											option.hint && (
												<Text color="gray">
													{"  "}
													{option.hint}
												</Text>
											)}
									</Box>
								);
							})}
							{showEndEllipsis && <Text color="gray">⋯</Text>}
						</>
					);
				})()
			)}
			{opts.searchable &&
				filteredOptions.length === 0 &&
				internalSearchQuery.trim() && (
					<Text color="red">
						No options match "{internalSearchQuery}"
					</Text>
				)}
			{error && <Text color="red">{error}</Text>}
			{opts.hintPosition === "bottom" && (
				<Box marginTop={1} key={`hint-${selectedIndex}`}>
					<Text color="gray">
						{(() => {
							// Check if none option is focused first
							if (opts.noneOption && selectedIndex === 0) {
								// None option doesn't support hints
								return " ";
							}

							// Find the focused option from filteredOptions
							const focusedOptionIndex =
								selectedIndex - (opts.noneOption ? 1 : 0);
							const focusedOption =
								filteredOptions[focusedOptionIndex];

							return focusedOption?.hint || " ";
						})()}
					</Text>
				</Box>
			)}
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
};
