import React, { useState, useEffect, useMemo, useRef } from "react";
import { Text, Box, useInput } from "ink";
import { ValidatorFunction, PluginState } from "../../types/index.js";

interface MultiFieldOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

interface MultiFieldProps {
	label: string;
	options?: string[] | MultiFieldOption[];
	initialValue?: string[];
	onSubmit: (values: string[]) => void;
	onBack?: () => void;
	allowBack?: boolean;
	state?: PluginState;
	completedValue?: string[];
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	noneOption?: {
		label: string;
	};
	showNumbers?: boolean;
	allowLoop?: boolean;
	searchable?: boolean;
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
	maxVisible?: number; // Maximum number of options visible at once (enables scrolling)
	searchQuery?: string;
	onSearchQueryChange?: (query: string) => void;
	onValidate?: ValidatorFunction<string[]>;
}

export function MultiField({
	label,
	options = [],
	initialValue = [],
	onSubmit,
	onBack,
	allowBack = true,
	state = "active",
	completedValue,
	onHintChange,
	isFirstRootPrompt = false,
	noneOption,
	showNumbers = false,
	allowLoop = true,
	searchable = false,
	hintPosition = "inline",
	maxVisible,
	searchQuery = "",
	onSearchQueryChange,
	onValidate,
}: MultiFieldProps) {
	const NONE_VALUE = "__NONE__";
	// Normalize options to support both string[] and MultiFieldOption[]
	const normalizedOptions: MultiFieldOption[] = useMemo(() => {
		return options.map((option) =>
			typeof option === "string"
				? { value: option, label: option }
				: option
		);
	}, [options]);

	const getInitialValues = (): string[] => {
		const vals = Array.isArray(initialValue) ? initialValue : [];
		if (!noneOption) return vals;
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
		if (!searchable || !internalSearchQuery.trim())
			return normalizedOptions;
		const q = internalSearchQuery.toLowerCase();
		return normalizedOptions.filter((opt) => {
			const isSelected = selectedValues.includes(opt.value);
			const matches =
				opt.label.toLowerCase().includes(q) ||
				opt.value.toLowerCase().includes(q);
			return isSelected || matches;
		});
	}, [normalizedOptions, searchable, internalSearchQuery, selectedValues]);

	const totalOptions = filteredOptions.length + (noneOption ? 1 : 0);

	// Simple navigation state
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Track current window position for edge-scrolling
	const [windowStart, setWindowStart] = useState(0);

	const navigateUp = () => {
		const newIndex = allowLoop
			? selectedIndex > 0
				? selectedIndex - 1
				: totalOptions - 1
			: Math.max(0, selectedIndex - 1);
		setSelectedIndex(newIndex);
	};

	const navigateDown = () => {
		const newIndex = allowLoop
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
		const isNoneOption = noneOption && optionValue === NONE_VALUE;
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
		const maxIndex = filteredOptions.length + (noneOption ? 1 : 0) - 1;
		if (selectedIndex > maxIndex) {
			setSelectedIndex(Math.max(0, maxIndex));
		}
	}, [filteredOptions.length, noneOption]);

	// Reset window position when options change significantly
	useEffect(() => {
		setWindowStart(0);
	}, [filteredOptions.length, maxVisible]);

	const disabled = state === "disabled";
	useEffect(() => {
		if (!disabled && submitted) setSubmitted(false);
	}, [disabled, submitted]);

	// Calculate visible window for options (including none option)
	// Combined list positions: 0=none (if present), 1=first_option, 2=second_option, etc.
	const getVisibleWindow = () => {
		const totalOptions = filteredOptions.length + (noneOption ? 1 : 0);

		if (!maxVisible || totalOptions <= maxVisible) {
			return {
				showNoneOption: !!noneOption,
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
			currentWindowStart + maxVisible,
			totalOptions
		);

		// If selected index is at or beyond the bottom of current window, scroll down
		if (selectedIndex >= currentWindowEnd) {
			currentWindowStart = selectedIndex - maxVisible + 1;
			currentWindowEnd = selectedIndex + 1;
		}
		// If selected index is before the top of current window, scroll up
		else if (selectedIndex < currentWindowStart) {
			currentWindowStart = selectedIndex;
			currentWindowEnd = selectedIndex + maxVisible;
		}

		// Ensure we don't exceed bounds
		currentWindowStart = Math.max(0, currentWindowStart);
		currentWindowEnd = Math.min(totalOptions, currentWindowEnd);

		// Adjust windowStart if we hit the end and have room to show more
		if (
			currentWindowEnd - currentWindowStart < maxVisible &&
			currentWindowStart > 0
		) {
			currentWindowStart = Math.max(0, currentWindowEnd - maxVisible);
		}

		// Update window position state if it changed
		if (currentWindowStart !== windowStart) {
			setWindowStart(currentWindowStart);
		}

		// Determine if none option should be shown (it's at position 0 in combined list)
		const showNoneOption = noneOption && currentWindowStart === 0;

		// Calculate which regular options to show
		// If none option is present, it occupies position 0, so regular options start at position 1
		let optionsStart, optionsEnd;

		if (noneOption) {
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
		if (!onValidate || state !== "active") {
			setValidationError(null);
			return true;
		}
		try {
			const result = await onValidate(vals);
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
			state === "active" ? (
				<>
					{!isFirstRootPrompt && allowBack && (
						<>
							<Text color="yellow">escape</Text> go back,{" "}
						</>
					)}
					<Text color="yellow">space</Text> select
					{searchable && (
						<>
							, <Text color="yellow">type</Text> to search
						</>
					)}
				</>
			) : null
		);
	}, [state, isFirstRootPrompt, searchable, allowBack, onHintChange]);

	const stableInitial = useMemo(
		() => [...initialValue],
		[initialValue.join(",")]
	);
	const prevInitialRef = useRef<string[]>([]);

	useEffect(() => {
		if (submitted || disabled) return;
		const changed =
			stableInitial.length !== prevInitialRef.current.length ||
			stableInitial.some((v, i) => v !== prevInitialRef.current[i]);
		if (changed) {
			let vals = [...stableInitial];
			if (noneOption) {
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
	}, [stableInitial, submitted, disabled, noneOption]);

	useInput(
		async (input, key) => {
			if (submitted || state !== "active") return;

			// Search input
			if (
				searchable &&
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
				if (searchable && internalSearchQuery.trim()) {
					setInternalSearchQuery("");
					return;
				}
				if (
					noneOption &&
					selectedValues.some((v) => v !== NONE_VALUE)
				) {
					setSelectedValues([NONE_VALUE]);
					setError(null);
					return;
				}
				if (allowBack && onBack) {
					onBack();
					return;
				}
			}

			if (key.return) {
				const vals = selectedValues.filter((v) => v !== NONE_VALUE);
				if (!(await runValidation(vals))) return;
				setSubmitted(true);
				onSubmit(vals);
				return;
			}

			if (input === " ") {
				const isNone = noneOption && selectedIndex === 0;
				const opt = isNone
					? { value: NONE_VALUE, label: noneOption!.label }
					: filteredOptions[selectedIndex - (noneOption ? 1 : 0)];
				if (opt) toggleSelection(opt.value);
				return;
			}

			if (searchable && (key.backspace || key.delete || input === "\b")) {
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

			if (showNumbers) {
				const num = parseInt(input);
				if (!isNaN(num) && num >= 1 && num <= totalOptions) {
					const idx = num - 1;
					setSelectedIndex(idx);
					const isNone = noneOption && idx === 0;
					const opt = isNone
						? { value: NONE_VALUE, label: noneOption!.label }
						: filteredOptions[idx - (noneOption ? 1 : 0)];
					if (opt) toggleSelection(opt.value);
					return;
				}
			}
		},
		{ isActive: state === "active" && !submitted }
	);

	if (state === "completed") {
		const val =
			(completedValue || []).length === 0 && noneOption
				? noneOption.label
				: (completedValue || []).join(", ");
		return (
			<Box flexDirection="column">
				<Text>{label}</Text>
				<Text color="blue">{val}</Text>
			</Box>
		);
	}

	if (state === "disabled") {
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
			{hintPosition === "side" ? (
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
											{showNumbers && "1. "}
											{noneOption!.label}
										</Text>
									)}
									{visibleOptions.map(
										(option, visibleIndex) => {
											const actualIndex =
												startIndex + visibleIndex;
											const displayIndex =
												actualIndex +
												(noneOption ? 2 : 1);
											const optionIndex =
												actualIndex +
												(noneOption ? 1 : 0);
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
													!searchable ||
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
													{showNumbers &&
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
												(noneOption ? 1 : 0);
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
			) : hintPosition === "inline-fixed" ? (
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
											{showNumbers && "1. "}
											{noneOption!.label}
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
									actualIndex + (noneOption ? 2 : 1);
								const optionIndex =
									actualIndex + (noneOption ? 1 : 0);
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
										!searchable ||
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
												{showNumbers &&
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
									{showNumbers && "1. "}
									{noneOption!.label}
								</Text>
							)}
							{visibleOptions.map((option, visibleIndex) => {
								const actualIndex = startIndex + visibleIndex;
								const displayIndex =
									actualIndex + (noneOption ? 2 : 1);
								const optionIndex =
									actualIndex + (noneOption ? 1 : 0);
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
										!searchable ||
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
											{showNumbers && `${displayIndex}. `}
											{renderLabel()}
										</Text>
										{hintPosition === "inline" &&
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
			{searchable &&
				filteredOptions.length === 0 &&
				internalSearchQuery.trim() && (
					<Text color="red">
						No options match "{internalSearchQuery}"
					</Text>
				)}
			{error && <Text color="red">{error}</Text>}
			{hintPosition === "bottom" && (
				<Box marginTop={1} key={`hint-${selectedIndex}`}>
					<Text color="gray">
						{(() => {
							// Check if none option is focused first
							if (noneOption && selectedIndex === 0) {
								// None option doesn't support hints
								return " ";
							}

							// Find the focused option from filteredOptions
							const focusedOptionIndex =
								selectedIndex - (noneOption ? 1 : 0);
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
}
