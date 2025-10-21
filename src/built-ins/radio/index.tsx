import React, { useState, useEffect } from "react";
import { Text, Box, useInput, Newline } from "ink";
import { createPrompt } from "../../core/registry.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";
import { TextInput } from "../../components/TextInput.js";

export interface RadioOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

/**
 * User-provided options for the radio input plugin
 */
export interface RadioOptions {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean;
	allowLoop?: boolean;
	searchable?: boolean | "filter";
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed";
	maxVisible?: number;
	initialValue?: string;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// id?, excludeFromCompleted?, hideOnCompletion?, allowBack?, onValidate?, meta?
}

// Core radio input plugin
export const radio = createPrompt<RadioOptions, string>({
	type: "radio",
	// autoSubmit: false (default) - Requires user interaction

	component: ({ node, options, events }: any) => {
		const [selectedIndex, setSelectedIndex] = useState(() => {
			if (options.initialValue && options.options) {
				const index = (options.options || []).findIndex(
					(option: RadioOption) =>
						option.value === options.initialValue
				);
				return index >= 0 ? index : 0;
			}
			return 0;
		});

		// Track current window position for edge-scrolling
		const [windowStart, setWindowStart] = useState(0);

		const [internalSearchQuery, setInternalSearchQuery] = useState("");
		const [searchCursorPosition, setSearchCursorPosition] = useState(0);
		const [submitted, setSubmitted] = useState(false);
		const [validationError, setValidationError] = useState<string | null>(
			null
		);
		const [filterModeActive, setFilterModeActive] = useState(false);

		const hasHiddenSearch = options.searchable === true;
		const hasFilterMode = options.searchable === "filter";
		const showSearchInput = hasFilterMode && filterModeActive;
		const isSearchActive =
			hasHiddenSearch || (hasFilterMode && filterModeActive);

		const filteredOptions =
			isSearchActive && internalSearchQuery.trim() && options.options
				? (options.options || []).filter(
						(opt: RadioOption) =>
							opt.label
								.toLowerCase()
								.includes(internalSearchQuery.toLowerCase()) ||
							opt.value
								.toLowerCase()
								.includes(internalSearchQuery.toLowerCase())
				  )
				: options.options || [];

		// Track if any options match the search
		const hasMatchingOptions =
			!isSearchActive ||
			!internalSearchQuery.trim() ||
			filteredOptions.length > 0;

		useEffect(() => {
			if (selectedIndex >= filteredOptions.length) {
				setSelectedIndex(Math.max(0, filteredOptions.length - 1));
			}
		}, [internalSearchQuery, filteredOptions.length, selectedIndex]);

		useEffect(
			() => setWindowStart(0),
			[filteredOptions.length, options.maxVisible]
		);

		const disabled = node.state === "disabled";
		useFieldReset(disabled, submitted, setSubmitted);

		// Calculate visible window for scrolling
		const getVisibleOptions = () => {
			if (
				!options.maxVisible ||
				filteredOptions.length <= options.maxVisible
			) {
				return {
					visibleOptions: filteredOptions,
					startIndex: 0,
					showStartEllipsis: false,
					showEndEllipsis: false,
				};
			}

			// Calculate visible window - scroll only when at edges
			let currentWindowStart = windowStart;
			let currentWindowEnd = Math.min(
				currentWindowStart + options.maxVisible,
				filteredOptions.length
			);

			// If selected index is at the bottom of current window, scroll down
			if (selectedIndex >= currentWindowEnd) {
				currentWindowStart = selectedIndex - options.maxVisible + 1;
				currentWindowEnd = selectedIndex + 1;
			}
			// If selected index is at the top of current window, scroll up
			else if (selectedIndex < currentWindowStart) {
				currentWindowStart = selectedIndex;
				currentWindowEnd = selectedIndex + options.maxVisible;
			}

			// Ensure we don't exceed bounds
			currentWindowStart = Math.max(0, currentWindowStart);
			currentWindowEnd = Math.min(
				filteredOptions.length,
				currentWindowEnd
			);

			// Adjust windowStart if we hit the end
			if (
				currentWindowEnd - currentWindowStart < options.maxVisible &&
				currentWindowStart > 0
			) {
				currentWindowStart = Math.max(
					0,
					currentWindowEnd - options.maxVisible
				);
			}

			// Update window position state if it changed
			if (currentWindowStart !== windowStart) {
				setWindowStart(currentWindowStart);
			}

			const visibleOptions = filteredOptions.slice(
				currentWindowStart,
				currentWindowEnd
			);
			const showStartEllipsis = currentWindowStart > 0;
			const showEndEllipsis = currentWindowEnd < filteredOptions.length;

			return {
				visibleOptions,
				startIndex: currentWindowStart,
				showStartEllipsis,
				showEndEllipsis,
			};
		};

		useEffect(() => {
			if (options.initialValue !== undefined) {
				const idx = (options.options || []).findIndex(
					(opt: RadioOption) => opt.value === options.initialValue
				);
				if (idx >= 0) setSelectedIndex(idx);
			}
		}, [options.initialValue, options.options]);

		const runValidation = async (val: string): Promise<boolean> => {
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

			// Check if there's any hint content to show
			const hasAnyHint =
				node.state === "active" &&
				((!node.isFirstRootPrompt && node.allowBack) ||
					hasHiddenSearch ||
					hasFilterMode);

			events.onHintChange(
				hasAnyHint ? (
					<>
						<Newline />
						{!node.isFirstRootPrompt && node.allowBack && (
							<>
								<Text color="yellow">escape</Text> go back
							</>
						)}
						{hasHiddenSearch && (
							<>
								{!node.isFirstRootPrompt && node.allowBack
									? ", "
									: ""}
								<Text color="yellow">type</Text> to search
							</>
						)}
						{hasFilterMode && (
							<>
								{!node.isFirstRootPrompt && node.allowBack
									? ", "
									: ""}
								<Text color="yellow">shift+f</Text> filter
							</>
						)}
					</>
				) : null
			);
		}, [
			node.state,
			node.isFirstRootPrompt,
			node.allowBack,
			hasHiddenSearch,
			hasFilterMode,
			showSearchInput,
			events.onHintChange,
		]);

		useInput(
			async (input, key) => {
				if (disabled || submitted) return;

				// Toggle filter mode with Shift+F
				if (
					hasFilterMode &&
					key.shift &&
					(input === "f" || input === "F")
				) {
					const wasActive = filterModeActive;
					// Clear search first, then toggle mode
					if (wasActive) {
						setInternalSearchQuery("");
						setSearchCursorPosition(0);
						setValidationError(null);
					}
					setFilterModeActive(!filterModeActive);
					return;
				}

				if (key.escape) {
					if (hasFilterMode && filterModeActive) {
						// Close filter mode
						setFilterModeActive(false);
						setInternalSearchQuery("");
						setSearchCursorPosition(0);
						setValidationError(null);
						return;
					}
					if (isSearchActive && internalSearchQuery.trim()) {
						setInternalSearchQuery("");
						setSearchCursorPosition(0);
						return;
					}
					if (node.allowBack && events.onBack) {
						events.onBack();
						return;
					}
				}

				// Handle Ctrl+A (jump to top) and Ctrl+E (jump to bottom)
				// Same shortcuts as cursor movement in text inputs
				if (key.ctrl && input === "a") {
					const { startIndex } = getVisibleOptions();
					setSelectedIndex(startIndex);
					return;
				}
				if (key.ctrl && input === "e") {
					const { visibleOptions, startIndex } = getVisibleOptions();
					const lastVisibleIndex =
						startIndex + visibleOptions.length - 1;
					setSelectedIndex(lastVisibleIndex);
					return;
				}

				// Handle arrow navigation for groups
				if (node.enableArrowNavigation && events.onNavigate) {
					if (key.upArrow && !node.isFirstInGroup) {
						events.onNavigate("up");
						return;
					}
					if (key.downArrow && !node.isLastInGroup) {
						events.onNavigate("down");
						return;
					}
				}

				if (key.return && filteredOptions.length > 0) {
					const val = filteredOptions[selectedIndex].value;
					if (!(await runValidation(val))) return;
					setSubmitted(true);
					events.onSubmit?.(val);
					return;
				}

				// Visible search input - arrow navigation for options
				if (showSearchInput) {
					if (key.upArrow || key.downArrow) {
						const maxIndex = filteredOptions.length - 1;
						const allowLoop = options.allowLoop ?? false;
						if (key.upArrow) {
							setSelectedIndex(
								allowLoop && selectedIndex === 0
									? maxIndex
									: Math.max(0, selectedIndex - 1)
							);
						} else {
							setSelectedIndex(
								allowLoop && selectedIndex === maxIndex
									? 0
									: Math.min(maxIndex, selectedIndex + 1)
							);
						}
						return;
					}
				} else {
					// Hidden search input - only for searchable: true
					if (
						hasHiddenSearch &&
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

					if (
						hasHiddenSearch &&
						(key.backspace || key.delete || input === "\b")
					) {
						setInternalSearchQuery(
							internalSearchQuery.slice(0, -1)
						);
						return;
					}

					// Arrow navigation
					if (!node.enableArrowNavigation) {
						const maxIndex = filteredOptions.length - 1;
						const allowLoop = options.allowLoop ?? false;
						if (key.leftArrow || key.upArrow) {
							setSelectedIndex(
								allowLoop && selectedIndex === 0
									? maxIndex
									: Math.max(0, selectedIndex - 1)
							);
							return;
						}
						if (key.rightArrow || key.downArrow) {
							setSelectedIndex(
								allowLoop && selectedIndex === maxIndex
									? 0
									: Math.min(maxIndex, selectedIndex + 1)
							);
							return;
						}
					}
				}

				// Number selection (works in both modes)
				if (options.showNumbers) {
					const num = parseInt(input);
					if (
						!isNaN(num) &&
						num >= 1 &&
						num <= filteredOptions.length
					) {
						const idx = num - 1;
						setSelectedIndex(idx);
						const val = filteredOptions[idx].value;
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						events.onSubmit?.(val);
						return;
					}
				}
			},
			{ isActive: node.state === "active" && !submitted }
		);

		if (node.state === "completed" && node.completedValue !== undefined) {
			const opt = (options.options || []).find(
				(o: RadioOption) => o.value === node.completedValue
			);
			return (
				<Box flexDirection="column">
					<Text>{options.label}</Text>
					<Text color="blue">
						{opt ? opt.label : node.completedValue}
					</Text>
				</Box>
			);
		}

		const renderLabel = (option: RadioOption, isSelected: boolean) => {
			if (!isSearchActive || !internalSearchQuery.trim())
				return option.label;

			const query = internalSearchQuery.toLowerCase();
			const label = option.label;
			const matchIndex = label.toLowerCase().indexOf(query);

			if (matchIndex === -1) return label;

			return (
				<>
					{label.slice(0, matchIndex)}
					<Text
						underline
						color={isSelected ? "cyan" : option.color || "white"}
					>
						{label.slice(matchIndex, matchIndex + query.length)}
					</Text>
					{label.slice(matchIndex + query.length)}
				</>
			);
		};

		const renderOption = (
			option: RadioOption,
			actualIndex: number,
			isInline: boolean
		) => {
			const isSelected = actualIndex === selectedIndex;
			const color = isSelected ? "cyan" : option.color || "gray";

			return (
				<>
					<Text color={color}>
						{isSelected ? "●" : "○"}{" "}
						{options.showNumbers && `${actualIndex + 1}. `}
						{renderLabel(option, isSelected)}
					</Text>
					{/* <Text color="cyan">{isSelected ? " ⨞" : "  "}</Text> */}
				</>
			);
		};

		const navigateUp = () => {
			const maxIndex = filteredOptions.length - 1;
			setSelectedIndex(
				options.allowLoop && selectedIndex === 0
					? maxIndex
					: Math.max(0, selectedIndex - 1)
			);
		};

		const navigateDown = () => {
			const maxIndex = filteredOptions.length - 1;
			setSelectedIndex(
				options.allowLoop && selectedIndex === maxIndex
					? 0
					: Math.min(maxIndex, selectedIndex + 1)
			);
		};

		const handleShiftF = () => {
			if (hasFilterMode) {
				const wasActive = filterModeActive;
				// Clear search first, then toggle mode
				if (wasActive) {
					setInternalSearchQuery("");
					setSearchCursorPosition(0);
					setValidationError(null);
				}
				setFilterModeActive(!filterModeActive);
			}
		};

		return (
			<Box flexDirection="column">
				<Box
					flexDirection="column"
					marginTop={node.isFirstInGroup ? 0 : 0}
				>
					<Text>{options.label}</Text>
					{showSearchInput && (
						<Box>
							<TextInput
								value={internalSearchQuery}
								onChange={setInternalSearchQuery}
								cursorPosition={searchCursorPosition}
								onCursorPositionChange={setSearchCursorPosition}
								isActive={node.state === "active" && !submitted}
								color="cyan"
								onUpArrow={navigateUp}
								onDownArrow={navigateDown}
								onShiftF={handleShiftF}
							/>
						</Box>
					)}
					{options.hintPosition === "side" ? (
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
												(
													option: RadioOption,
													visibleIndex: number
												) => {
													const actualIndex =
														startIndex +
														visibleIndex;
													return (
														<Box key={option.value}>
															{renderOption(
																option,
																actualIndex,
																false
															)}
														</Box>
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
												(
													option: RadioOption,
													visibleIndex: number
												) => {
													const actualIndex =
														startIndex +
														visibleIndex;
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
					) : options.hintPosition === "inline-fixed" ? (
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
									{visibleOptions.map(
										(
											option: RadioOption,
											visibleIndex: number
										) => {
											const actualIndex =
												startIndex + visibleIndex;
											const isSelected =
												actualIndex === selectedIndex;
											return (
												<Box
													key={option.value}
													flexDirection="row"
												>
													<Box width={25}>
														{renderOption(
															option,
															actualIndex,
															false
														)}
													</Box>
													<Box flexGrow={1}>
														<Text color="gray">
															{isSelected &&
															option.hint
																? option.hint
																: ""}
														</Text>
													</Box>
												</Box>
											);
										}
									)}
									{showEndEllipsis && (
										<Text color="gray">⋯</Text>
									)}
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
									{visibleOptions.map(
										(
											option: RadioOption,
											visibleIndex: number
										) => {
											const actualIndex =
												startIndex + visibleIndex;
											const isSelected =
												actualIndex === selectedIndex;
											return (
												<Box
													key={option.value}
													flexDirection="row"
												>
													{renderOption(
														option,
														actualIndex,
														false
													)}
													{options.hintPosition ===
														"inline" &&
														isSelected &&
														option.hint && (
															<Text color="gray">
																{" "}
																{option.hint}
															</Text>
														)}
												</Box>
											);
										}
									)}
									{showEndEllipsis && (
										<Text color="gray">⋯</Text>
									)}
								</>
							);
						})()
					)}
					{isSearchActive &&
						!hasMatchingOptions &&
						internalSearchQuery.trim() && (
							<Text color="red">
								No options match "{internalSearchQuery}"
							</Text>
						)}
					{options.hintPosition === "bottom" && (
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
	},
});
