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
 * Components can submit with special values to indicate submission type:
 * - "__auto" for auto-submission
 * - "__skip" for skipped submission
 * - { value: actualValue, __submissionType: "auto" } for auto-submission with value
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

	return { node, options, events };
}
