import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { spinnerStore } from "./spinner-store.js";
import type {
	SpinnerOptions,
	SpinnerStatus,
	SpinnerState,
	SpinnerLabel,
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

	const getColor = (status: SpinnerStatus): string => {
		return (
			{
				idle: "gray",
				running: "grey",
				paused: "grey",
				stopped: "grey",
			}[status] || "gray"
		);
	};

	// Auto-submit when stopped
	useEffect(() => {
		if (node.state !== "active") return;

		if (spinnerState.status === "stopped" && events.onSubmit) {
			events.onSubmit({ type: "auto" });
		}
	}, [spinnerState.status, node.state, events.onSubmit]);

	// Don't render until we're ready to show
	if (!shouldShow) {
		return null;
	}

	return (
		<Box>
			<Text color={getColor(spinnerState.status)}>
				{getSymbol(spinnerState.status)} {getLabel(spinnerState.status)}
			</Text>
		</Box>
	);
};
