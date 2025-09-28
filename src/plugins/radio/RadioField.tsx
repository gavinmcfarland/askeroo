import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { ValidatorFunction } from "../../types/validation.js";

interface RadioOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

interface Props {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
	maxVisible?: number; // Maximum number of options visible at once (enables scrolling)
	onSubmit: (
		value:
			| string
			| { __preserveAndBack: boolean; value: string }
			| { __clearGroupAndBack: boolean }
	) => void;
	onBack?: () => void;
	initialValue?: string;
	allowBack?: boolean;
	completed?: boolean;
	completedValue?: string;
	disabled?: boolean;
	flow?: "progressive" | "phased" | "static";
	onNavigate?: (direction: "up" | "down") => void;
	isFirstInGroup?: boolean;
	isLastInGroup?: boolean;
	enableArrowNavigation?: boolean;
	onHintChange?: (hint: React.ReactNode) => void;
	isFirstRootPrompt?: boolean;
	onValidate?: ValidatorFunction<string>;
}

export function RadioField({
	label,
	shortLabel,
	options = [],
	showNumbers = false,
	allowLoop = true,
	searchable = false,
	hintPosition = "inline",
	maxVisible,
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
}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (initialValue && options) {
			const index = options.findIndex(
				(option) => option.value === initialValue
			);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	// Track current window position for edge-scrolling
	const [windowStart, setWindowStart] = useState(0);

	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const currentSearchQuery = internalSearchQuery;
	const [submitted, setSubmitted] = useState(false);
	const [validationError, setValidationError] = useState<string | null>(null);

	// Filter options based on search query
	const filteredOptions =
		searchable && currentSearchQuery.trim() && options
			? options.filter(
					(option) =>
						option.label
							.toLowerCase()
							.includes(currentSearchQuery.toLowerCase()) ||
						option.value
							.toLowerCase()
							.includes(currentSearchQuery.toLowerCase())
			  )
			: options || [];

	// Reset selected index when search query changes
	useEffect(() => {
		if (selectedIndex >= filteredOptions.length) {
			setSelectedIndex(Math.max(0, filteredOptions.length - 1));
		}
	}, [currentSearchQuery, filteredOptions.length, selectedIndex]);

	// Reset window position when options change significantly
	useEffect(() => {
		setWindowStart(0);
	}, [filteredOptions.length, maxVisible]);

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

	// Calculate visible window for scrolling
	const getVisibleOptions = () => {
		if (!maxVisible || filteredOptions.length <= maxVisible) {
			return {
				visibleOptions: filteredOptions,
				startIndex: 0,
				showStartEllipsis: false,
				showEndEllipsis: false,
			};
		}

		// Calculate visible window - scroll only when at edges
		let currentWindowStart = windowStart;
		let currentWindowEnd = Math.min(currentWindowStart + maxVisible, filteredOptions.length);

		// If selected index is at the bottom of current window, scroll down
		if (selectedIndex >= currentWindowEnd) {
			currentWindowStart = selectedIndex - maxVisible + 1;
			currentWindowEnd = selectedIndex + 1;
		}
		// If selected index is at the top of current window, scroll up
		else if (selectedIndex < currentWindowStart) {
			currentWindowStart = selectedIndex;
			currentWindowEnd = selectedIndex + maxVisible;
		}

		// Ensure we don't exceed bounds
		currentWindowStart = Math.max(0, currentWindowStart);
		currentWindowEnd = Math.min(filteredOptions.length, currentWindowEnd);

		// Adjust windowStart if we hit the end
		if (currentWindowEnd - currentWindowStart < maxVisible && currentWindowStart > 0) {
			currentWindowStart = Math.max(0, currentWindowEnd - maxVisible);
		}

		// Update window position state if it changed
		if (currentWindowStart !== windowStart) {
			setWindowStart(currentWindowStart);
		}

		const visibleOptions = filteredOptions.slice(currentWindowStart, currentWindowEnd);
		const showStartEllipsis = currentWindowStart > 0;
		const showEndEllipsis = currentWindowEnd < filteredOptions.length;

		return {
			visibleOptions,
			startIndex: currentWindowStart,
			showStartEllipsis,
			showEndEllipsis,
		};
	};

	// Update selected index when initialValue changes
	useEffect(() => {
		if (initialValue !== undefined) {
			const index = options.findIndex(
				(option) => option.value === initialValue
			);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [initialValue, options]);

	// Helper function to run validation on submission attempt
	const runValidation = async (valueToValidate: string): Promise<boolean> => {
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
			const hintText = (
				<>
					{!isFirstRootPrompt && allowBack && (
						<>
							<Text color="yellow">escape</Text> go back
						</>
					)}
					{searchable && (
						<>
							{!isFirstRootPrompt && allowBack ? ", " : ""}
							<Text color="yellow">type</Text> to search
						</>
					)}
				</>
			);
			onHintChange(hintText);
		} else {
			// Clear hint when field is disabled/completed
			onHintChange(null);
		}
	}, [
		disabled,
		completed,
		isFirstRootPrompt,
		allowBack,
		showNumbers,
		searchable,
		filteredOptions.length,
	]); // Removed onHintChange from dependencies

	useInput(async (input, key) => {
		if (disabled || submitted) return;

		// Handle back navigation (Escape)
		if (key.escape) {
			// If searching, clear the search query first
			if (searchable && currentSearchQuery.trim()) {
				setInternalSearchQuery("");
				return;
			}

			// Only go back if allowed
			if (allowBack && onBack) {
				onBack();
				return;
			}
		}

		// Handle arrow navigation for groups
		if (enableArrowNavigation && onNavigate) {
			if (key.upArrow && !isFirstInGroup) {
				onNavigate("up");
				return;
			}
			if (key.downArrow && !isLastInGroup) {
				onNavigate("down");
				return;
			}
		}

		if (key.return) {
			if (filteredOptions.length > 0) {
				const selectedValue = filteredOptions[selectedIndex].value;
				// Check validation before submitting
				const isValid = await runValidation(selectedValue);
				if (!isValid) {
					// Don't submit if there's a validation error
					return;
				}
				setSubmitted(true);
				onSubmit(selectedValue);
			}
			return;
		}

		// Handle search input if searchable is enabled
		if (searchable && input && input !== " ") {
			// Check if it's a printable character (not a special key)
			if (
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
				const newQuery = currentSearchQuery + input;
				setInternalSearchQuery(newQuery);
				return;
			}
		}

		// Handle backspace for search
		if (searchable && (key.backspace || key.delete || input === "\b")) {
			const newQuery = currentSearchQuery.slice(0, -1);
			setInternalSearchQuery(newQuery);
			return;
		}

		// Handle left/right arrow navigation in options
		if (key.leftArrow && !enableArrowNavigation) {
			const newIndex =
				selectedIndex > 0
					? selectedIndex - 1
					: allowLoop
					? filteredOptions.length - 1
					: selectedIndex;
			setSelectedIndex(newIndex);
			return;
		}

		if (key.rightArrow && !enableArrowNavigation) {
			const newIndex =
				selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: allowLoop
					? 0
					: selectedIndex;
			setSelectedIndex(newIndex);
			return;
		}

		// Handle up/down arrow navigation in options (if not used for group navigation)
		if (key.upArrow && !enableArrowNavigation) {
			const newIndex = allowLoop
				? selectedIndex > 0
					? selectedIndex - 1
					: filteredOptions.length - 1
				: Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			return;
		}

		if (key.downArrow && !enableArrowNavigation) {
			const newIndex = allowLoop
				? selectedIndex < filteredOptions.length - 1
					? selectedIndex + 1
					: 0
				: Math.min(filteredOptions.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			return;
		}

		// Handle number keys for direct selection (only if showNumbers is enabled)
		if (showNumbers === true) {
			const num = parseInt(input);
			if (!isNaN(num) && num >= 1 && num <= filteredOptions.length) {
				const newIndex = num - 1;
				setSelectedIndex(newIndex);
				const selectedValue = filteredOptions[newIndex].value;
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
		}
	});

	// Show completed state
	if (completed && completedValue !== undefined) {
		const completedOption = options.find(
			(option) => option.value === completedValue
		);
		const displayLabel = completedOption
			? completedOption.label
			: completedValue;

		return (
			<Box flexDirection="column">
				<Text>{label}</Text>
				<Text>
					<Text color="blue">{displayLabel}</Text>
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box
				flexDirection="column"
				marginBottom={isLastInGroup && flow === "phased" ? 1 : 0}
				marginTop={isFirstInGroup ? 0 : 0}
			>
				<Text>{label}</Text>
				{hintPosition === "side" ? (
					<Box flexDirection="row">
						<Box flexDirection="column" width={25}>
							{(() => {
								const {
									visibleOptions,
									startIndex,
									showStartEllipsis,
									showEndEllipsis,
								} = getVisibleOptions();
								return (
									<>
										{showStartEllipsis && (
											<Text color="gray">⋯</Text>
										)}
										{visibleOptions.map(
											(option, visibleIndex) => {
												const actualIndex =
													startIndex + visibleIndex;
												const isSelected =
													actualIndex ===
													selectedIndex;
												const color = isSelected
													? "cyan"
													: option.color || "gray";

												// Highlight matching text if searching
												const renderLabel = () => {
													if (
														!searchable ||
														!currentSearchQuery.trim()
													) {
														return option.label;
													}

													const query =
														currentSearchQuery.toLowerCase();
													const label = option.label;
													const lowerLabel =
														label.toLowerCase();
													const matchIndex =
														lowerLabel.indexOf(
															query
														);

													if (matchIndex === -1) {
														return label; // No match found, return original
													}

													const beforeMatch =
														label.slice(
															0,
															matchIndex
														);
													const match = label.slice(
														matchIndex,
														matchIndex +
															query.length
													);
													const afterMatch =
														label.slice(
															matchIndex +
																query.length
														);

													// Use cyan for focused items, option color or white for non-focused
													const highlightColor =
														isSelected
															? "cyan"
															: option.color ||
															  "white";

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
														{isSelected ? "●" : "○"}{" "}
														{showNumbers === true &&
															`${
																actualIndex + 1
															}. `}
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
									visibleOptions,
									startIndex,
									showStartEllipsis,
									showEndEllipsis,
								} = getVisibleOptions();
								return (
									<>
										{showStartEllipsis && (
											<Text color="gray"></Text>
										)}
										{visibleOptions.map(
											(option, visibleIndex) => {
												const actualIndex =
													startIndex + visibleIndex;
												const isSelected =
													actualIndex ===
													selectedIndex;
												return (
													<Text
														key={option.value}
														color="gray"
													>
														{isSelected &&
														option.hint
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
							visibleOptions,
							startIndex,
							showStartEllipsis,
							showEndEllipsis,
						} = getVisibleOptions();
						return (
							<>
								{showStartEllipsis && (
									<Text color="gray">⋯</Text>
								)}
								{visibleOptions.map((option, visibleIndex) => {
									const actualIndex =
										startIndex + visibleIndex;
									const isSelected =
										actualIndex === selectedIndex;
									const color = isSelected
										? "cyan"
										: option.color || "gray";

									// Highlight matching text if searching
									const renderLabel = () => {
										if (
											!searchable ||
											!currentSearchQuery.trim()
										) {
											return option.label;
										}

										const query =
											currentSearchQuery.toLowerCase();
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
										const highlightColor = isSelected
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
										<Box
											key={option.value}
											flexDirection="row"
										>
											<Box width={25}>
												<Text color={color}>
													{isSelected ? "●" : "○"}{" "}
													{showNumbers === true &&
														`${actualIndex + 1}. `}
													{renderLabel()}
												</Text>
											</Box>
											<Box flexGrow={1}>
												<Text color="gray">
													{isSelected && option.hint
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
							visibleOptions,
							startIndex,
							showStartEllipsis,
							showEndEllipsis,
						} = getVisibleOptions();
						return (
							<>
								{showStartEllipsis && (
									<Text color="gray">⋯</Text>
								)}
								{visibleOptions.map((option, visibleIndex) => {
									const actualIndex =
										startIndex + visibleIndex;
									const isSelected =
										actualIndex === selectedIndex;
									const color = isSelected
										? "cyan"
										: option.color || "gray";

									// Highlight matching text if searching
									const renderLabel = () => {
										if (
											!searchable ||
											!currentSearchQuery.trim()
										) {
											return option.label;
										}

										const query =
											currentSearchQuery.toLowerCase();
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
										const highlightColor = isSelected
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
										<Box
											key={option.value}
											flexDirection="row"
										>
											<Text color={color}>
												{isSelected ? "●" : "○"}{" "}
												{showNumbers === true &&
													`${actualIndex + 1}. `}
												{renderLabel()}
											</Text>
											{hintPosition === "inline" &&
												isSelected &&
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
					currentSearchQuery.trim() && (
						<Text color="red">
							No options match "{currentSearchQuery}"
						</Text>
					)}
				{hintPosition === "bottom" && (
					<Box marginTop={1} key={`hint-${selectedIndex}`}>
						<Text color="gray">
							{filteredOptions[selectedIndex]?.hint || " "}
						</Text>
					</Box>
				)}
			</Box>
			{validationError && (
				<Box>
					<Text color="red">{validationError}</Text>
				</Box>
			)}
		</Box>
	);
}
