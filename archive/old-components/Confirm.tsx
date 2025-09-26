import React, { useState, useEffect } from "react";
import { Text, Box, useInput } from "ink";
import { FieldProps, BaseFieldConfig, PublicFieldConfig } from "../../types.js";
import { isMarkdownString, parseMarkdown } from "../../utils/markdown.js";

// Type to ensure at least 2 options when provided
type AtLeastTwo<T> = T extends readonly [any, any, ...any[]] ? T : never;

// Confirm field specific configuration
export interface ConfirmFieldConfig extends BaseFieldConfig {
	options?: Array<{ value: any; label: string }>;
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
}

// Public confirm field configuration - excludes internal properties
export interface PublicConfirmFieldConfig extends PublicFieldConfig {
	options?: Array<{ value: any; label: string }>;
	allowLoop?: boolean; // Whether to allow looping when navigating with up/down arrows (default: true)
}

// Strict confirm field config that enforces minimum 2 options using tuple types
export interface StrictConfirmFieldConfig extends BaseFieldConfig {
	options: AtLeastTwo<
		[
			{ value: any; label: string },
			{ value: any; label: string },
			...{ value: any; label: string }[]
		]
	>;
}

export function Confirm({
	config,
	value,
	onChange,
	onSubmit,
	onBack,
	isActive,
}: FieldProps<any> & { config: ConfirmFieldConfig }) {
	// Default options if none provided
	const defaultOptions = [
		{ value: true, label: "Yes" },
		{ value: false, label: "No" },
	];
	const options = config?.options || defaultOptions;

	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (value !== undefined) {
			const index = options.findIndex((option) => option.value === value);
			return index >= 0 ? index : 0;
		}
		return 0;
	});

	useInput((input, key) => {
		if (!isActive) return;

		// Handle back navigation (Escape)
		if (key.escape) {
			if (onBack) {
				config.onBack?.();
				onBack();
			}
			return;
		}

		if (key.return) {
			const selectedValue = options[selectedIndex].value;
			onChange(selectedValue);
			onSubmit(selectedValue);
			return;
		}

		// Handle Y/N keys only for default Yes/No options
		if (
			options === defaultOptions &&
			(input.toLowerCase() === "y" || input.toLowerCase() === "n")
		) {
			const newValue = input.toLowerCase() === "y";
			const newIndex = options.findIndex(
				(option) => option.value === newValue
			);
			setSelectedIndex(newIndex);
			config.onInput?.(newValue);
			onChange(newValue);
			onSubmit(newValue);
			return;
		}

		if (key.leftArrow) {
			const newIndex =
				selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
			setSelectedIndex(newIndex);
			const newValue = options[newIndex].value;
			config.onInput?.(newValue);
		}

		if (key.rightArrow) {
			const newIndex =
				selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
			setSelectedIndex(newIndex);
			const newValue = options[newIndex].value;
			config.onInput?.(newValue);
		}

		// Handle up arrow navigation
		if (key.upArrow) {
			const allowLoop = config.allowLoop !== false; // Default to true
			const newIndex = allowLoop
				? selectedIndex > 0
					? selectedIndex - 1
					: options.length - 1
				: Math.max(0, selectedIndex - 1);
			setSelectedIndex(newIndex);
			const newValue = options[newIndex].value;
			config.onInput?.(newValue);
		}

		// Handle down arrow navigation
		if (key.downArrow) {
			const allowLoop = config.allowLoop !== false; // Default to true
			const newIndex = allowLoop
				? selectedIndex < options.length - 1
					? selectedIndex + 1
					: 0
				: Math.min(options.length - 1, selectedIndex + 1);
			setSelectedIndex(newIndex);
			const newValue = options[newIndex].value;
			config.onInput?.(newValue);
		}
	});

	// Update selected index when value prop changes (for new fields)
	useEffect(() => {
		if (value !== undefined) {
			const index = options.findIndex((option) => option.value === value);
			if (index >= 0) {
				setSelectedIndex(index);
			}
		}
	}, [value, options]);

	// Render message - either as markdown or plain text
	const renderMessage = () => {
		if (!config?.message) return null;

		if (isMarkdownString(config.message)) {
			const elements = parseMarkdown(
				config.message.content,
				config.message.theme
			);
			return (
				<Box flexDirection="column">
					{elements.map((element, index) => (
						<Box key={index}>{element}</Box>
					))}
				</Box>
			);
		}

		return <Text>{config.message}</Text>;
	};

	return (
		<Box flexDirection="column">
			{renderMessage()}
			<Box flexDirection="row" gap={2}>
				{options.map((option, index) => (
					<Text
						key={option.value}
						color={index === selectedIndex ? "cyan" : "gray"}
					>
						{index === selectedIndex ? "●" : "○"} {option.label}
						<Text color="yellow">
							{index === selectedIndex && isActive ? "█" : " "}
						</Text>
					</Text>
				))}
			</Box>
		</Box>
	);
}
