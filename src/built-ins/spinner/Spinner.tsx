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
	SpinnerSymbol,
} from "./types.js";

export type {
	SpinnerOptions,
	SpinnerStatus,
	SpinnerState,
	SpinnerLabel,
	SpinnerSymbol,
};

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

	// Use the spinner ID from options
	const spinnerId =
		options.spinnerId ||
		`spinner_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

	// Subscribe to the spinner store - auto-updates on any store change
	const store = spinnerStore.use();

	// Extract data for this spinner
	const spinnerState = store.spinners.get(spinnerId) || { status: "idle" };

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
		// Check if currentSymbol is set in state
		const customSymbol = spinnerState.currentSymbol || options.symbol;

		if (customSymbol) {
			// If it's a string, use it for all states
			if (typeof customSymbol === "string") {
				return customSymbol;
			} else {
				// It's a SpinnerSymbol object
				const symbolObj = customSymbol as SpinnerSymbol;

				// Handle running symbol (can be string or array)
				if (status === "running" && symbolObj.running) {
					if (Array.isArray(symbolObj.running)) {
						return symbolObj.running[
							spinnerFrame % symbolObj.running.length
						];
					}
					return symbolObj.running;
				}

				// Handle other statuses
				if (status === "idle" && symbolObj.idle) return symbolObj.idle;
				if (status === "paused" && symbolObj.paused)
					return symbolObj.paused;
				if (status === "stopped" && symbolObj.stopped)
					return symbolObj.stopped;
			}
		}

		// Fall back to default symbols
		return (
			{
				idle: "□",
				running: spinnerFrames[spinnerFrame],
				paused: "●",
				stopped: "■",
			}[status] || " "
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

	// Auto-submit immediately when active (like streams do)
	// This allows multiple spinners to run concurrently without blocking each other
	// Use deferCompletion to prevent the node from being marked as completed until stopped
	useEffect(() => {
		if (node.state === "active" && events.onSubmit) {
			// Submit immediately to allow runtime to continue, but defer completion
			events.onSubmit({ type: "auto", deferCompletion: true });
		}
	}, [node.state, events.onSubmit]);

	// Mark node as completed when spinner is stopped
	useEffect(() => {
		if (spinnerState.status === "stopped" && events.onComplete) {
			// If there's a submitDelay, wait for it before marking as complete
			if (options.submitDelay && options.submitDelay > 0) {
				const timer = setTimeout(() => {
					events.onComplete(); // PluginWrapper handles the promptId
				}, options.submitDelay);
				return () => clearTimeout(timer);
			} else {
				// Mark as complete immediately
				events.onComplete(); // PluginWrapper handles the promptId
			}
		}
	}, [spinnerState.status, events.onComplete, options.submitDelay]);

	// Track whether we should hide after delay (for hideOnCompletion with submitDelay)
	const [shouldHideAfterDelay, setShouldHideAfterDelay] = useState(false);

	// Handle delayed hiding when spinner stops with submitDelay
	useEffect(() => {
		// Only applies when hideOnCompletion is true and there's a submitDelay
		if (
			!options.hideOnCompletion ||
			!options.submitDelay ||
			options.submitDelay === 0
		) {
			return;
		}

		// When spinner stops, wait for submitDelay then trigger hiding
		if (spinnerState.status === "stopped") {
			const timer = setTimeout(() => {
				setShouldHideAfterDelay(true);
			}, options.submitDelay);

			return () => clearTimeout(timer);
		}
	}, [spinnerState.status, options.submitDelay, options.hideOnCompletion]);

	// Don't render if we're completed and should hide
	if (options.hideOnCompletion && node.state === "completed") {
		const spinnerFinished = spinnerState.status === "stopped";

		// If spinner finished and either no delay or delay has elapsed
		if (spinnerFinished) {
			// No delay: hide immediately
			if (!options.submitDelay || options.submitDelay === 0) {
				return null;
			}
			// With delay: hide after delay timer completes
			if (shouldHideAfterDelay) {
				return null;
			}
		}
	}

	// Don't render if we're inactive (not active, not completed, just disabled)
	// AND the spinner is stopped (not running/paused)
	// This prevents stopped background spinners from showing after submission
	if (node.state === "disabled" && spinnerState.status === "stopped") {
		return null;
	}

	// Build display text with symbol (or blank space during grace period to prevent layout shift)
	// Show symbol if: not idle, OR idle but grace period has ended
	const shouldShowSymbol =
		spinnerState.status !== "idle" || !spinnerState.gracePeriodActive;
	const symbol = shouldShowSymbol ? getSymbol(spinnerState.status) : " ";
	const label = getLabel(spinnerState.status);
	const displayText = `${symbol} ${label}`;
	const styledText = applyStyles(displayText);

	return (
		<Box>
			<Text>{styledText}</Text>
		</Box>
	);
};
