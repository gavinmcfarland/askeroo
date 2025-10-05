import React from "react";
import { Text, Box } from "ink";
import { PromptNode, PromptTreeManager } from "../core/prompt-tree.js";
import { globalRegistry } from "../core/registry.js";
import { PluginWrapper } from "./PluginWrapper.js";

interface HintTextProps {
	children: React.ReactNode;
}

function HintText({ children }: HintTextProps) {
	return (
		<Box>
			<Text dimColor>{children}</Text>
		</Box>
	);
}

interface RecursiveGroupContainerProps {
	item: PromptNode;
	treeManager: PromptTreeManager;
	onSubmit?: (value: any) => void;
	onBack?: () => void;
	onHintChange?: (hint: React.ReactNode) => void;
	hintText?: React.ReactNode; // Hint text for the currently active field
	showOnlyActiveAndCompleted?: boolean; // Control visibility of pending fields
}

export function RecursiveGroupContainer({
	item,
	treeManager,
	onSubmit,
	onBack,
	onHintChange,
	hintText,
	showOnlyActiveAndCompleted = false,
}: RecursiveGroupContainerProps) {
	// Calculate indentation based on depth
	// Depth 0 = root, depth 1 = root children (0 indent), depth 2 = first nesting level (3 spaces), etc.
	const baseIndent = Math.max(0, (item.depth - 1) * 3);

	// For group nodes, render through the plugin system
	if (item.type === "group") {
		// Check if group plugin exists
		const groupPluginExists = globalRegistry.getComponent("group");
		if (!groupPluginExists) {
			return null;
		}

		// Don't render anything for empty groups without a label
		if ((!item.children || item.children.length === 0) && !item.label) {
			return null;
		}

		// Empty group with label only
		if (!item.children || item.children.length === 0) {
			return (
				<PluginWrapper
					pluginType="group"
					key={`group-${item.id}-empty`}
					label={item.label}
					flow={item.flow}
					depth={item.depth}
					state={
						item.active
							? "active"
							: item.completed
							? "completed"
							: "disabled"
					}
				/>
			);
		}

		// Filter children based on visibility rules
		const visibleChildren = item.children.filter((child) => {
			if (showOnlyActiveAndCompleted) {
				// Only show active, completed, or visited children
				return child.active || child.completed || child.visited;
			}

			// For static groups, show all discovered children BUT only if the group itself should be visible
			// The group visibility should be controlled at a higher level (when the group is added to the tree)
			if (item.flow === "static") {
				return true; // Show all children in static groups (group-level visibility is controlled elsewhere)
			}

			// For root level (no flow), show first pending field
			if (!item.flow && item.id === "root") {
				// Show completed, active, and first pending
				if (child.completed || child.active) {
					return true;
				}
				// Show first pending field
				const siblings = item.children;
				const childIndex = siblings.indexOf(child);
				const allPreviousCompleted = siblings
					.slice(0, childIndex)
					.every((prev) => prev.completed);
				return allPreviousCompleted;
			}

			// For progressive/phased groups, show completed, active, and the next pending field
			if (child.completed || child.active) {
				return true;
			}

			// Also show the first pending field that should be next
			if (item.flow === "progressive") {
				// In progressive flow, show the next pending field after all completed ones
				const siblings = item.children;
				const childIndex = siblings.indexOf(child);
				const allPreviousCompleted = siblings
					.slice(0, childIndex)
					.every((prev) => prev.completed);
				return allPreviousCompleted;
			}

			return false;
		});

		if (visibleChildren.length === 0) {
			// If group has a label, show it even without visible children
			if (item.label) {
				return (
					<PluginWrapper
						pluginType="group"
						key={`group-${item.id}-no-visible`}
						label={item.label}
						flow={item.flow}
						depth={item.depth}
						state={item.active ? "active" : "disabled"}
					/>
				);
			}
			return null;
		}

		// Determine group state
		const groupState =
			item.completed && !item.active
				? "completed"
				: item.active
				? "active"
				: "disabled";

		// Handle completed groups differently - only show completed fields
		const childrenToRender =
			item.completed && !item.active
				? visibleChildren.filter(
						(child) =>
							child.type === "field" &&
							child.completed &&
							!child.hideAfterSubmit
				  )
				: visibleChildren;

		// If no children to render and no label, return null
		if (childrenToRender.length === 0 && !item.label) {
			return null;
		}

		// Render children recursively
		const renderedChildren = (
			<>
				{childrenToRender.map((child, index) => (
					<RecursiveGroupContainer
						key={`${item.id}-child-${child.id}-${index}`}
						item={child}
						treeManager={treeManager}
						onSubmit={onSubmit}
						onBack={onBack}
						onHintChange={onHintChange}
						hintText={child.active ? hintText : undefined}
						showOnlyActiveAndCompleted={
							showOnlyActiveAndCompleted ||
							(item.completed && !item.active)
						}
					/>
				))}
				{/* Show hint text for the active group */}
				{item.active && hintText && <HintText>{hintText}</HintText>}
			</>
		);

		// Render group through plugin system
		return (
			<PluginWrapper
				pluginType="group"
				key={`group-${item.id}-${groupState}`}
				label={item.label}
				flow={item.flow}
				depth={item.depth}
				state={groupState}
				children={renderedChildren}
			/>
		);
	}

	// For field nodes, render the appropriate component
	if (item.type === "field" && item.fieldType) {
		const pluginExists = globalRegistry.getComponent(item.fieldType);

		if (!pluginExists) {
			return null;
		}

		const isActive = item.active;
		const isCompleted = item.completed && !isActive;
		const isVisited = item.visited;

		// Skip rendering if field should be hidden after submit
		if (isCompleted && item.hideAfterSubmit) {
			return null;
		}

		// For showOnlyActiveAndCompleted mode, only show active or completed fields
		if (showOnlyActiveAndCompleted && !isActive && !isCompleted) {
			return null;
		}

		// Get initial value
		const getInitialValue = () => {
			if (item.value !== undefined) {
				return item.value;
			}

			// Check if there's an initialValue in properties
			if (item.properties.initialValue !== undefined) {
				return item.properties.initialValue;
			}

			// Type-specific defaults
			if (item.fieldType === "multi") return [];
			if (item.fieldType === "confirm") return false;
			return "";
		};

		// Determine position in group for navigation
		const parent = item.parent;
		const siblingIndex = parent ? parent.children.indexOf(item) : 0;
		const isFirstInGroup = siblingIndex === 0;
		const isLastInGroup = parent
			? siblingIndex === parent.children.length - 1
			: true;

		// Check if this is the first prompt in the root flow
		const isFirstRootPrompt = item.depth === 1 && isFirstInGroup;

		// Determine flow type
		const flowType = parent?.flow || "progressive";

		// CompletedFields and other display-only plugins should not be indented
		const shouldIndent = item.fieldType !== "completedFields";

		// Determine plugin state
		const pluginState = isCompleted
			? "completed"
			: !isActive
			? "disabled"
			: "active";

		return (
			<Box marginLeft={shouldIndent ? baseIndent : 0}>
				<PluginWrapper
					pluginType={item.fieldType}
					key={`plugin-${item.id}-${item.depth}-${pluginState}`}
					{...item.properties} // Spread all plugin properties
					message={item.label || ""}
					initialValue={getInitialValue()}
					state={pluginState}
					completedValue={isCompleted ? item.value : undefined}
					onSubmit={isActive ? onSubmit : () => {}}
					onBack={isActive ? onBack : undefined}
					allowBack={item.allowBack !== false}
					flow={flowType}
					isFirstInGroup={isFirstInGroup}
					isLastInGroup={isLastInGroup}
					isFirstRootPrompt={isFirstRootPrompt}
					enableArrowNavigation={parent?.enableArrowNavigation}
					{...(isActive && onHintChange && { onHintChange })}
				/>
				{/* Show hint text for active fields */}
				{isActive && hintText && <HintText>{hintText}</HintText>}
			</Box>
		);
	}

	// Fallback for unknown types
	return null;
}
