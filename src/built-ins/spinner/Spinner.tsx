import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";
import { spinnerStore } from "./spinner-store.js";
import type {
	SpinnerOptions,
	SpinnerStatus,
	SpinnerState,
	SpinnerLabel,
	SpinnerStyle,
} from "./types.js";

export type { SpinnerOptions, SpinnerStatus, SpinnerState, SpinnerLabel };

// Main component for the spinner plugin
export const SpinnerDisplay = ({
	node,
	options,
	events,
}: {
	node: any;
	options: SpinnerOptions;
	events: any;
}) => {
	const [spinnerFrame, setSpinnerFrame] = useState(0);
	const [shouldShow, setShouldShow] = useState(false);

	// Use the spinner ID from options
	const spinnerId =
		options.spinnerId ||
		`spinner_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

	// Subscribe to the spinner store - auto-updates on any store change
	const store = spinnerStore.use();

	// Extract data for this spinner
	const spinnerState = store.spinners.get(spinnerId) || { status: "idle" };

	// Delay showing the idle state to avoid flicker if start() is called immediately
	useEffect(() => {
		// If not idle, show immediately
		if (spinnerState.status !== "idle") {
			setShouldShow(true);
			return;
		}

		// For idle state, add a small delay before showing
		const timer = setTimeout(() => {
			setShouldShow(true);
		}, 100);

		return () => clearTimeout(timer);
	}, [spinnerState.status]);

	// Animated spinner frames
	const spinnerFrames = ["⠂", "-", "–", "—", "–", "-"];

	// Block all input during spinner execution to prevent escape sequences from showing
	useInput(() => {}, { isActive: spinnerState.status === "running" });

	// Animate spinner only when running
	useEffect(() => {
		if (spinnerState.status !== "running") {
			return;
		}

		const interval = setInterval(() => {
			setSpinnerFrame((prev) => (prev + 1) % spinnerFrames.length);
		}, 150);

		return () => clearInterval(interval);
	}, [spinnerState.status]);

	const getLabel = (status: SpinnerStatus): string => {
		// If currentLabel is set in state, use it
		if (spinnerState.currentLabel) {
			return spinnerState.currentLabel;
		}

		// Otherwise use the original label logic
		if (typeof options.label === "string") return options.label;

		const labelObj = options.label as SpinnerLabel;
		const fallback = labelObj?.idle || "Loading";

		return (
			{
				idle: labelObj?.idle || fallback,
				running: labelObj?.running || fallback,
				paused: labelObj?.paused || fallback,
				stopped: labelObj?.stopped || fallback,
			}[status] || fallback
		);
	};

	const getSymbol = (status: SpinnerStatus): string => {
		return (
			{
				idle: "□",
				running: spinnerFrames[spinnerFrame],
				paused: "●",
				stopped: "■",
			}[status] || "□"
		);
	};

	const applyStyles = (text: string): string => {
		// Get current style from state or fall back to options
		const style = spinnerState.currentStyle || {
			color: options.color,
			bgColor: options.bgColor,
			dim: options.dim,
		};

		if (!style.color && !style.bgColor && style.dim === undefined) {
			return text;
		}

		let styledText: string = text;

		// Apply color
		if (style.color && (chalk as any)[style.color]) {
			const colorFn = (chalk as any)[style.color];
			if (typeof colorFn === "function") {
				styledText = colorFn(styledText) as string;
			}
		}

		// Apply background color
		if (style.bgColor) {
			const bgKey = `bg${style.bgColor
				.charAt(0)
				.toUpperCase()}${style.bgColor.slice(1)}`;
			const bgFn = (chalk as any)[bgKey];
			if (typeof bgFn === "function") {
				styledText = bgFn(styledText) as string;
			}
		}

		// Apply dim
		if (style.dim) {
			styledText = chalk.dim(styledText) as string;
		}

		return styledText;
	};

	// Auto-submit when stopped (with optional delay)
	useEffect(() => {
		if (node.state !== "active") return;

		if (spinnerState.status === "stopped" && events.onSubmit) {
			const delay =
				options.submitDelay !== undefined ? options.submitDelay : 0;

			// If hideOnCompletion and no delay, submit immediately
			if (options.hideOnCompletion && delay === 0) {
				events.onSubmit({ type: "auto" });
			} else {
				const timer = setTimeout(() => {
					events.onSubmit({ type: "auto" });
				}, delay);
				return () => clearTimeout(timer);
			}
		}
	}, [
		spinnerState.status,
		node.state,
		events.onSubmit,
		options.submitDelay,
		options.hideOnCompletion,
	]);

	// Hide if hideOnCompletion is true and spinner is completed
	if (options.hideOnCompletion && node.state === "completed") {
		return null;
	}

	// Don't render stopped state if hideOnCompletion is true and there's no delay
	if (
		options.hideOnCompletion &&
		spinnerState.status === "stopped" &&
		(!options.submitDelay || options.submitDelay === 0)
	) {
		return null;
	}

	// Don't render until we're ready to show
	if (!shouldShow) {
		return null;
	}

	const displayText = `${getSymbol(spinnerState.status)} ${getLabel(
		spinnerState.status
	)}`;
	const styledText = applyStyles(displayText);

	return (
		<Box>
			<Text>{styledText}</Text>
		</Box>
	);
};
