import { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { parseMarkdown, isMarkdownString } from "../../utils/markdown.js";

interface RadioOption {
	value: string;
	label: string;
}

interface Props {
	label: string;
	shortLabel?: string;
	options: RadioOption[];
	showNumbers?: boolean; // Whether to show numbers for selection
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
	searchable?: boolean; // Whether to enable search functionality (default: false)
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
}

export function RadioField({
	label,
	shortLabel,
	options = [],
	showNumbers = false,
	allowLoop = true,
	searchable = false,
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

	const [internalSearchQuery, setInternalSearchQuery] = useState("");
	const currentSearchQuery = internalSearchQuery;
	const [submitted, setSubmitted] = useState(false);

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

	// Reset submitted state when field becomes active again (not disabled)
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted]);

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

	// Provide hint text to parent component
	useEffect(() => {
		if (!onHintChange) return;

		if (!disabled && !completed) {
			const hintText = (
				<>
					<Text color="yellow">enter</Text> proceed
					{!isFirstRootPrompt && (
						<>
							, <Text color="yellow">escape</Text> go back
						</>
					)}
					{searchable && (
						<>
							, <Text color="yellow">type</Text> to search
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

	useInput((input, key) => {
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
			<Box
				marginBottom={isLastInGroup && flow === "phased" ? 1 : 0}
				marginTop={isFirstInGroup ? 0 : 0}
			>
				<Text color="green">✓</Text>
				<Text color="gray" dimColor>
					{" "}
					{shortLabel || label}:{" "}
				</Text>
				<Text>{displayLabel}</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			marginBottom={isLastInGroup && flow === "phased" ? 1 : 0}
			marginTop={isFirstInGroup ? 0 : 0}
		>
			<Text>{label}</Text>
			{filteredOptions.map((option, index) => {
				const isSelected = index === selectedIndex;
				const color = isSelected ? "cyan" : "gray";

				// Highlight matching text if searching
				const renderLabel = () => {
					if (!searchable || !currentSearchQuery.trim()) {
						return option.label;
					}

					const query = currentSearchQuery.toLowerCase();
					const label = option.label;
					const lowerLabel = label.toLowerCase();
					const matchIndex = lowerLabel.indexOf(query);

					if (matchIndex === -1) {
						return label; // No match found, return original
					}

					const beforeMatch = label.slice(0, matchIndex);
					const match = label.slice(
						matchIndex,
						matchIndex + query.length
					);
					const afterMatch = label.slice(matchIndex + query.length);

					// Use cyan for focused items, white for non-focused
					const highlightColor = isSelected ? "cyan" : "white";

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
					<Text key={option.value} color={color}>
						{isSelected ? "●" : "○"}{" "}
						{showNumbers === true && `${index + 1}. `}
						{renderLabel()}
					</Text>
				);
			})}
			{searchable &&
				filteredOptions.length === 0 &&
				currentSearchQuery.trim() && (
					<Text color="red">
						No options match "{currentSearchQuery}"
					</Text>
				)}
		</Box>
	);
}
