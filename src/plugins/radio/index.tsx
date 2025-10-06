import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { createPlugin } from "../../core/registry.js";
import { useFieldReset } from "../../hooks/use-auto-submit.js";

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
	searchable?: boolean;
	hintPosition?: "bottom" | "inline" | "side" | "inline-fixed";
	maxVisible?: number;
	initialValue?: string;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// id?, excludeFromCompleted?, hideAfterSubmit?, allowBack?, onValidate?, meta?
}

// Core radio input plugin
export const radio = createPlugin<RadioOptions, string>({
	type: "radio",
	interactive: true,

	component: ({ node, options: opts, events }: any) => {
		const [selectedIndex, setSelectedIndex] = useState(() => {
			if (opts.initialValue && opts.options) {
				const index = (opts.options || []).findIndex(
					(option: RadioOption) => option.value === opts.initialValue
				);
				return index >= 0 ? index : 0;
			}
			return 0;
		});

		// Track current window position for edge-scrolling
		const [windowStart, setWindowStart] = useState(0);

		const [internalSearchQuery, setInternalSearchQuery] = useState("");
		const [submitted, setSubmitted] = useState(false);
		const [validationError, setValidationError] = useState<string | null>(
			null
		);

		const filteredOptions =
			opts.searchable && internalSearchQuery.trim() && opts.options
				? (opts.options || []).filter(
						(opt: RadioOption) =>
							opt.label
								.toLowerCase()
								.includes(internalSearchQuery.toLowerCase()) ||
							opt.value
								.toLowerCase()
								.includes(internalSearchQuery.toLowerCase())
				  )
				: opts.options || [];

		useEffect(() => {
			if (selectedIndex >= filteredOptions.length) {
				setSelectedIndex(Math.max(0, filteredOptions.length - 1));
			}
		}, [internalSearchQuery, filteredOptions.length, selectedIndex]);

		useEffect(
			() => setWindowStart(0),
			[filteredOptions.length, opts.maxVisible]
		);

		const disabled = node.state === "disabled";
		useFieldReset(disabled, submitted, setSubmitted);

		// Calculate visible window for scrolling
		const getVisibleOptions = () => {
			if (!opts.maxVisible || filteredOptions.length <= opts.maxVisible) {
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
				currentWindowStart + opts.maxVisible,
				filteredOptions.length
			);

			// If selected index is at the bottom of current window, scroll down
			if (selectedIndex >= currentWindowEnd) {
				currentWindowStart = selectedIndex - opts.maxVisible + 1;
				currentWindowEnd = selectedIndex + 1;
			}
			// If selected index is at the top of current window, scroll up
			else if (selectedIndex < currentWindowStart) {
				currentWindowStart = selectedIndex;
				currentWindowEnd = selectedIndex + opts.maxVisible;
			}

			// Ensure we don't exceed bounds
			currentWindowStart = Math.max(0, currentWindowStart);
			currentWindowEnd = Math.min(
				filteredOptions.length,
				currentWindowEnd
			);

			// Adjust windowStart if we hit the end
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
			if (opts.initialValue !== undefined) {
				const idx = (opts.options || []).findIndex(
					(opt: RadioOption) => opt.value === opts.initialValue
				);
				if (idx >= 0) setSelectedIndex(idx);
			}
		}, [opts.initialValue, opts.options]);

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
			events.onHintChange(
				node.state === "active" ? (
					<>
						{!node.isFirstRootPrompt && node.allowBack && (
							<>
								<Text color="yellow">escape</Text> go back
							</>
						)}
						{opts.searchable && (
							<>
								{!node.isFirstRootPrompt && node.allowBack
									? ", "
									: ""}
								<Text color="yellow">type</Text> to search
							</>
						)}
					</>
				) : null
			);
		}, [
			node.state,
			node.isFirstRootPrompt,
			node.allowBack,
			opts.searchable,
			events.onHintChange,
		]);

		useInput(
			async (input, key) => {
				if (disabled || submitted) return;

				if (key.escape) {
					if (opts.searchable && internalSearchQuery.trim()) {
						setInternalSearchQuery("");
						return;
					}
					if (node.allowBack && events.onBack) {
						events.onBack();
						return;
					}
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

				if (
					opts.searchable &&
					(key.backspace || key.delete || input === "\b")
				) {
					setInternalSearchQuery(internalSearchQuery.slice(0, -1));
					return;
				}

				// Arrow navigation
				if (key.leftArrow && !node.enableArrowNavigation) {
					setSelectedIndex(
						selectedIndex > 0
							? selectedIndex - 1
							: opts.allowLoop
							? filteredOptions.length - 1
							: selectedIndex
					);
					return;
				}
				if (key.rightArrow && !node.enableArrowNavigation) {
					setSelectedIndex(
						selectedIndex < filteredOptions.length - 1
							? selectedIndex + 1
							: opts.allowLoop
							? 0
							: selectedIndex
					);
					return;
				}
				if (key.upArrow && !node.enableArrowNavigation) {
					setSelectedIndex(
						opts.allowLoop
							? selectedIndex > 0
								? selectedIndex - 1
								: filteredOptions.length - 1
							: Math.max(0, selectedIndex - 1)
					);
					return;
				}
				if (key.downArrow && !node.enableArrowNavigation) {
					setSelectedIndex(
						opts.allowLoop
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
				if (opts.showNumbers) {
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
			const opt = (opts.options || []).find(
				(o: RadioOption) => o.value === node.completedValue
			);
			return (
				<Box flexDirection="column">
					<Text>{opts.label}</Text>
					<Text color="blue">
						{opt ? opt.label : node.completedValue}
					</Text>
				</Box>
			);
		}

		const renderLabel = (option: RadioOption, isSelected: boolean) => {
			if (!opts.searchable || !internalSearchQuery.trim()) {
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
			const match = optLabel.slice(matchIndex, matchIndex + query.length);
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
					marginTop={node.isFirstInGroup ? 0 : 0}
				>
					<Text>{opts.label}</Text>
					{opts.hintPosition === "side" ? (
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
															key={option.value}
															color={color}
														>
															{isSelected
																? "●"
																: "○"}{" "}
															{opts.showNumbers ===
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
					) : opts.hintPosition === "inline-fixed" ? (
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
															{opts.showNumbers ===
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
												actualIndex === selectedIndex;
											const color = isSelected
												? "cyan"
												: option.color || "gray";

											return (
												<Box
													key={option.value}
													flexDirection="row"
												>
													<Text color={color}>
														{isSelected ? "●" : "○"}{" "}
														{opts.showNumbers ===
															true &&
															`${
																actualIndex + 1
															}. `}
														{renderLabel(
															option,
															isSelected
														)}
													</Text>
													{opts.hintPosition ===
														"inline" &&
														isSelected &&
														option.hint && (
															<Text color="gray">
																{"  "}
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
					{opts.searchable &&
						filteredOptions.length === 0 &&
						internalSearchQuery.trim() && (
							<Text color="red">
								No options match "{internalSearchQuery}"
							</Text>
						)}
					{opts.hintPosition === "bottom" && (
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
