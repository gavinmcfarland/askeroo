import React from "react";
import { globalRegistry } from "../core/registry.js";
import { useAutoSubmit } from "../hooks/use-auto-submit.js";

interface PluginWrapperProps {
	pluginType: string;
	[key: string]: any;
}

/**
 * Wrapper component that automatically handles auto-submission for non-interactive plugins.
 * Interactive plugins are rendered as-is, while non-interactive plugins get auto-submit behavior.
 *
 * This wrapper transforms flat props into a structured format with:
 * - `options`: User-provided configuration (label, shortLabel, initialValue, etc.)
 * - `node`: Library flow node properties (state, flow, isFirstInGroup, etc.)
 * - `events`: Event handlers (onSubmit, onBack, onHintChange, etc.)
 */
export function PluginWrapper({ pluginType, ...props }: PluginWrapperProps) {
	const PluginComponent = globalRegistry.getComponent(pluginType);
	const isInteractive = globalRegistry.isInteractive(pluginType);

	if (!PluginComponent) {
		return null;
	}

	// Transform flat props into structured format
	const transformedProps = transformPropsToStructure(props);

	// For non-interactive plugins, wrap with auto-submit logic
	if (!isInteractive) {
		return (
			<NonInteractiveWrapper
				PluginComponent={PluginComponent}
				{...transformedProps}
			/>
		);
	}

	// For interactive plugins, render directly
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

/**
 * Inner wrapper that applies auto-submit behavior to non-interactive plugins
 */
function NonInteractiveWrapper({
	PluginComponent,
	node,
	options,
	events,
}: {
	PluginComponent: React.ComponentType<any>;
	node: Record<string, any>;
	options: Record<string, any>;
	events: Record<string, any>;
}) {
	// Auto-submit for non-interactive plugins with minimal delay
	useAutoSubmit(events.onSubmit, node.state || "active", 10);

	// Render the plugin component
	return <PluginComponent node={node} options={options} events={events} />;
}
