import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../core/registry.js";
import { ValidatorFunction } from "../../types/index.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";

export interface RadioOption {
	value: string;
	label: string;
	color?: string;
	hint?: string;
}

export interface RadioOptions {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed"; // Where to display option hints (default: "inline")
	maxVisible?: number; // Maximum number of options visible at once (enables scrolling)
	initialValue?: string;
	id?: string;
	excludeFromCompleted?: boolean;
	hideAfterSubmit?: boolean;
	allowBack?: boolean; // If false, prevents user from going back with escape key
	onValidate?: ValidatorFunction<string>;
	meta?: Record<string, any>; // User-defined metadata for this field
}

// Core radio input plugin
export const radio = createPlugin<RadioOptions, string>({
	type: "radio",
	interactive: true,

	render: () =>
		function RadioField({
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
		}: any) {
			const [selectedIndex, setSelectedIndex] = useState(() => {
				if (initialValue && options) {
					const index = options.findIndex(
						(option: RadioOption) => option.value === initialValue
					);
					return index >= 0 ? index : 0;
				}
				return 0;
			});

			// Track current window position for edge-scrolling
			const [windowStart, setWindowStart] = useState(0);

			const [internalSearchQuery, setInternalSearchQuery] = useState("");
			const [submitted, setSubmitted] = useState(false);
			const [validationError, setValidationError] = useState<
				string | null
			>(null);

			const filteredOptions =
				searchable && internalSearchQuery.trim() && options
					? options.filter(
							(opt: RadioOption) =>
								opt.label
									.toLowerCase()
									.includes(
										internalSearchQuery.toLowerCase()
									) ||
								opt.value
									.toLowerCase()
									.includes(internalSearchQuery.toLowerCase())
					  )
					: options || [];

			useEffect(() => {
				if (selectedIndex >= filteredOptions.length) {
					setSelectedIndex(Math.max(0, filteredOptions.length - 1));
				}
			}, [internalSearchQuery, filteredOptions.length, selectedIndex]);

			useEffect(
				() => setWindowStart(0),
				[filteredOptions.length, maxVisible]
			);

			const disabled = state === "disabled";
			useFieldReset(disabled, submitted, setSubmitted);

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
				let currentWindowEnd = Math.min(
					currentWindowStart + maxVisible,
					filteredOptions.length
				);

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
				currentWindowEnd = Math.min(
					filteredOptions.length,
					currentWindowEnd
				);

				// Adjust windowStart if we hit the end
				if (
					currentWindowEnd - currentWindowStart < maxVisible &&
					currentWindowStart > 0
				) {
					currentWindowStart = Math.max(
						0,
						currentWindowEnd - maxVisible
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
				const showEndEllipsis =
					currentWindowEnd < filteredOptions.length;

				return {
					visibleOptions,
					startIndex: currentWindowStart,
					showStartEllipsis,
					showEndEllipsis,
				};
			};

			useEffect(() => {
				if (initialValue !== undefined) {
					const idx = options.findIndex(
						(opt: RadioOption) => opt.value === initialValue
					);
					if (idx >= 0) setSelectedIndex(idx);
				}
			}, [initialValue, options]);

			const runValidation = async (val: string): Promise<boolean> => {
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
					state === "active" ? (
						<>
							{!isFirstRootPrompt && allowBack && (
								<>
									<Text color="yellow">escape</Text> go back
								</>
							)}
							{searchable && (
								<>
									{!isFirstRootPrompt && allowBack
										? ", "
										: ""}
									<Text color="yellow">type</Text> to search
								</>
							)}
						</>
					) : null
				);
			}, [state, isFirstRootPrompt, allowBack, searchable, onHintChange]);

			useInput(
				async (input, key) => {
					if (disabled || submitted) return;

					if (key.escape) {
						if (searchable && internalSearchQuery.trim()) {
							setInternalSearchQuery("");
							return;
						}
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

					if (key.return && filteredOptions.length > 0) {
						const val = filteredOptions[selectedIndex].value;
						if (!(await runValidation(val))) return;
						setSubmitted(true);
						onSubmit(val);
						return;
					}

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

					if (
						searchable &&
						(key.backspace || key.delete || input === "\b")
					) {
						setInternalSearchQuery(
							internalSearchQuery.slice(0, -1)
						);
						return;
					}

					// Arrow navigation
					if (key.leftArrow && !enableArrowNavigation) {
						setSelectedIndex(
							selectedIndex > 0
								? selectedIndex - 1
								: allowLoop
								? filteredOptions.length - 1
								: selectedIndex
						);
						return;
					}
					if (key.rightArrow && !enableArrowNavigation) {
						setSelectedIndex(
							selectedIndex < filteredOptions.length - 1
								? selectedIndex + 1
								: allowLoop
								? 0
								: selectedIndex
						);
						return;
					}
					if (key.upArrow && !enableArrowNavigation) {
						setSelectedIndex(
							allowLoop
								? selectedIndex > 0
									? selectedIndex - 1
									: filteredOptions.length - 1
								: Math.max(0, selectedIndex - 1)
						);
						return;
					}
					if (key.downArrow && !enableArrowNavigation) {
						setSelectedIndex(
							allowLoop
								? selectedIndex < filteredOptions.length - 1
									? selectedIndex + 1
									: 0
								: Math.min(
										filteredOptions.length - 1,
										selectedIndex + 1
								  )
						);
						return;
					}

					// Number selection
					if (showNumbers) {
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
							onSubmit(val);
							return;
						}
					}
				},
				{ isActive: state === "active" && !submitted }
			);

			if (state === "completed" && completedValue !== undefined) {
				const opt = options.find(
					(o: RadioOption) => o.value === completedValue
				);
				return (
					<Box flexDirection="column">
						<Text>{label}</Text>
						<Text color="blue">
							{opt ? opt.label : completedValue}
						</Text>
					</Box>
				);
			}

			const renderLabel = (option: RadioOption, isSelected: boolean) => {
				if (!searchable || !internalSearchQuery.trim()) {
					return option.label;
				}

				const query = internalSearchQuery.toLowerCase();
				const optLabel = option.label;
				const lowerLabel = optLabel.toLowerCase();
				const matchIndex = lowerLabel.indexOf(query);

				if (matchIndex === -1) {
					return optLabel;
				}

				const beforeMatch = optLabel.slice(0, matchIndex);
				const match = optLabel.slice(
					matchIndex,
					matchIndex + query.length
				);
				const afterMatch = optLabel.slice(matchIndex + query.length);
				const highlightColor = isSelected
					? "cyan"
					: option.color || "white";

				return (
					<>
						{beforeMatch}
						<Text underline color={highlightColor}>
							{match}
						</Text>
						{afterMatch}
					</>
				);
			};

			return (
				<Box flexDirection="column">
					<Box
						flexDirection="column"
						marginBottom={
							isLastInGroup && flow === "phased" ? 1 : 0
						}
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
														const color = isSelected
															? "cyan"
															: option.color ||
															  "gray";

														return (
															<Text
																key={
																	option.value
																}
																color={color}
															>
																{isSelected
																	? "●"
																	: "○"}{" "}
																{showNumbers ===
																	true &&
																	`${
																		actualIndex +
																		1
																	}. `}
																{renderLabel(
																	option,
																	isSelected
																)}
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
																key={
																	option.value
																}
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
										{visibleOptions.map(
											(
												option: RadioOption,
												visibleIndex: number
											) => {
												const actualIndex =
													startIndex + visibleIndex;
												const isSelected =
													actualIndex ===
													selectedIndex;
												const color = isSelected
													? "cyan"
													: option.color || "gray";

												return (
													<Box
														key={option.value}
														flexDirection="row"
													>
														<Box width={25}>
															<Text color={color}>
																{isSelected
																	? "●"
																	: "○"}{" "}
																{showNumbers ===
																	true &&
																	`${
																		actualIndex +
																		1
																	}. `}
																{renderLabel(
																	option,
																	isSelected
																)}
															</Text>
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
													actualIndex ===
													selectedIndex;
												const color = isSelected
													? "cyan"
													: option.color || "gray";

												return (
													<Box
														key={option.value}
														flexDirection="row"
													>
														<Text color={color}>
															{isSelected
																? "●"
																: "○"}{" "}
															{showNumbers ===
																true &&
																`${
																	actualIndex +
																	1
																}. `}
															{renderLabel(
																option,
																isSelected
															)}
														</Text>
														{hintPosition ===
															"inline" &&
															isSelected &&
															option.hint && (
																<Text color="gray">
																	{"  "}
																	{
																		option.hint
																	}
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
						{searchable &&
							filteredOptions.length === 0 &&
							internalSearchQuery.trim() && (
								<Text color="red">
									No options match "{internalSearchQuery}"
								</Text>
							)}
						{hintPosition === "bottom" && (
							<Box marginTop={1} key={`hint-${selectedIndex}`}>
								<Text color="gray">
									{filteredOptions[selectedIndex]?.hint ||
										" "}
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
