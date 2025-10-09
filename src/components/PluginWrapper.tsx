import React from "react";
import { globalRegistry } from "../core/registry.js";

interface PluginWrapperProps {
	pluginType: string;
	[key: string]: any;
}

/**
 * Wrapper component that transforms flat props into structured format.
 *
 * This wrapper transforms flat props into a structured format with:
 * - `options`: User-provided configuration (label, shortLabel, initialValue, etc.)
 * - `node`: Library flow node properties (state, flow, isFirstInGroup, etc.)
 * - `events`: Event handlers (onSubmit, onBack, onHintChange, etc.)
 *
 * Note: Auto-submit behavior is now controlled within each plugin component.
 * Components submit with consistent format: { type: "auto" | "skip" | "programmatic", value?: any }
 * Regular values (non-objects or objects without type property) are treated as manual submissions
 */
export function PluginWrapper({ pluginType, ...props }: PluginWrapperProps) {
	const PluginComponent = globalRegistry.getComponent(pluginType);

	if (!PluginComponent) {
		return null;
	}

	// Transform flat props into structured format
	const transformedProps = transformPropsToStructure(props);

	// Render plugin component directly
	return <PluginComponent {...transformedProps} />;
}

/**
 * Transform flat props into structured format with node, options, and events
 */
function transformPropsToStructure(props: Record<string, any>) {
	// Define known node properties
	const nodeProps = [
		"state",
		"flow",
		"isFirstInGroup",
		"isLastInGroup",
		"isFirstRootPrompt",
		"allowBack",
		"completedValue",
		"enableArrowNavigation",
		"depth",
		"children",
	];

	// Define known event handlers
	const eventProps = [
		"onSubmit",
		"onBack",
		"onHintChange",
		"onValidate",
		"onNavigate",
	];

	// Separate props into their categories
	const node: Record<string, any> = {};
	const events: Record<string, any> = {};
	const options: Record<string, any> = {};

	for (const [key, value] of Object.entries(props)) {
		if (nodeProps.includes(key)) {
			node[key] = value;
		} else if (eventProps.includes(key)) {
			events[key] = value;
		} else {
			options[key] = value;
		}
	}

	// Wrap onSubmit to automatically apply setTimeout for auto/skip/programmatic submissions
	if (events.onSubmit) {
		const originalOnSubmit = events.onSubmit;
		events.onSubmit = (value: any) => {
			// Check if this is an auto/skip/programmatic submission
			const isSpecialSubmission =
				typeof value === "object" &&
				value !== null &&
				"type" in value &&
				(value.type === "auto" ||
					value.type === "skip" ||
					value.type === "programmatic");

			if (isSpecialSubmission) {
				// Get delay from submission object, default to 100ms
				const delay = typeof value.delay === "number" ? value.delay : 0;

				// Apply setTimeout with the specified delay
				setTimeout(() => {
					originalOnSubmit(value);
				}, delay);
			} else {
				// Regular submission - call immediately
				originalOnSubmit(value);
			}
		};
	}

	return { node, options, events };
}
