import React from "react";
import { globalRegistry } from "../../registry.js";
import { useAutoSubmit } from "../../hooks/use-auto-submit.js";

interface PluginWrapperProps {
	pluginType: string;
	[key: string]: any;
}

/**
 * Wrapper component that automatically handles auto-submission for non-interactive plugins.
 * Interactive plugins are rendered as-is, while non-interactive plugins get auto-submit behavior.
 */
export function PluginWrapper({ pluginType, ...props }: PluginWrapperProps) {
	const PluginComponent = globalRegistry.getComponent(pluginType);
	const isInteractive = globalRegistry.isInteractive(pluginType);

	if (!PluginComponent) {
		return null;
	}

	// For non-interactive plugins, wrap with auto-submit logic
	if (!isInteractive) {
		return (
			<NonInteractiveWrapper
				PluginComponent={PluginComponent}
				{...props}
			/>
		);
	}

	// For interactive plugins, render directly
	return <PluginComponent {...props} />;
}

/**
 * Inner wrapper that applies auto-submit behavior to non-interactive plugins
 */
function NonInteractiveWrapper({
	PluginComponent,
	onSubmit,
	completed,
	disabled,
	...props
}: {
	PluginComponent: React.ComponentType<any>;
	onSubmit?: (value: any) => void;
	completed?: boolean;
	disabled?: boolean;
	[key: string]: any;
}) {
	// Auto-submit for non-interactive plugins
	useAutoSubmit(onSubmit, completed, disabled);

	// Render the plugin component without the auto-submit logic
	return (
		<PluginComponent
			onSubmit={onSubmit}
			completed={completed}
			disabled={disabled}
			{...props}
		/>
	);
}
