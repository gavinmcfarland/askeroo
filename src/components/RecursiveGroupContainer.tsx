import React from "react";
import { Text, Box, Newline } from "ink";
import { PromptNode, PromptTreeManager } from "../core/prompt-tree.js";
import { globalRegistry } from "../core/registry.js";
import { PluginWrapper } from "./PluginWrapper.js";

interface HintTextProps {
	children: React.ReactNode;
}

function HintText({ children }: HintTextProps) {
	return (
		<>
			<Text> </Text>
			<Text dimColor>{children}</Text>
		</>
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
	isFrozen?: boolean; // Indicates this is a frozen prompt that should not be interactive
	hintsByPromptId?: Map<string, React.ReactNode>; // Map of hint text by prompt ID
}

export function RecursiveGroupContainer({
	item,
	treeManager,
	onSubmit,
	onBack,
	onHintChange,
	hintText,
	showOnlyActiveAndCompleted = false,
	isFrozen = false,
	hintsByPromptId,
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
					{...item.properties} // Spread all properties including hideOnCompletion
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

		// Note: Removed auto-completion logic as it was triggering too early
		// Groups are completed in the runtime when their body function finishes

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

			// Handle different flow types separately
			if (item.flow === "progressive") {
				// Progressive flow: show completed, active, and the next pending field
				if (child.completed || child.active) {
					return true;
				}
				// Show the next pending field after all completed ones
				const siblings = item.children;
				const childIndex = siblings.indexOf(child);
				const allPreviousCompleted = siblings
					.slice(0, childIndex)
					.every((prev) => prev.completed);
				return allPreviousCompleted;
			}

			if (item.flow === "phased") {
				// Phased flow: show only the active field during execution
				// The last completed field will be shown only after group completion
				// For groups inside phased groups, also hide completed groups
				if (
					child.type === "group" &&
					child.completed &&
					!child.active
				) {
					return false;
				}
				return child.active;
			}

			return false;
		});

		// Determine group state BEFORE checking visibleChildren
		const groupState =
			item.completed && !item.active
				? "completed"
				: item.active
				? "active"
				: "disabled";

		// Handle completed groups differently based on flow type
		// This logic must come BEFORE the visibleChildren.length === 0 check
		const childrenToRender =
			item.completed && !item.active
				? item.flow === "phased"
					? // Phased: show only the last prompt, unless this group is inside another phased group
					  item.parent?.flow === "phased"
						? [] // Hide all if nested inside another phased group
						: (() => {
								// Find the last completed field from all children (not just visibleChildren)
								const allCompletedFields = item.children.filter(
									(c) =>
										c.type === "field" &&
										c.completed &&
										!c.hideOnCompletion
								);
								const lastCompletedField =
									allCompletedFields[
										allCompletedFields.length - 1
									];

								// Return the last completed field directly, don't rely on visibleChildren
								// because visibleChildren was filtered for active state during execution
								return lastCompletedField
									? [lastCompletedField]
									: [];
						  })()
					: visibleChildren.filter(
							(child) =>
								// Progressive: show completed fields and completed groups
								child.completed &&
								(child.type === "group" ||
									(child.type === "field" &&
										!child.hideOnCompletion))
					  )
				: visibleChildren;

		// Handle case where active/pending groups have no visible children
		if (!item.completed && visibleChildren.length === 0) {
			// If group has a label, show it even without visible children
			if (item.label) {
				return (
					<PluginWrapper
						pluginType="group"
						key={`group-${item.id}-no-visible`}
						{...item.properties} // Spread all properties including hideOnCompletion
						label={item.label}
						flow={item.flow}
						depth={item.depth}
						state={item.active ? "active" : "disabled"}
					/>
				);
			}
			return null;
		}

		// If no children to render and no label, return null
		if (childrenToRender.length === 0 && !item.label) {
			return null;
		}

		// Render children recursively
		// Pass down hints map and let each child determine its own hint
		const renderedChildren = childrenToRender.map((child, index) => {
			// Determine hint text for this specific child
			const childHintText = child.active
				? (hintsByPromptId?.get(child.id) || (child.id === item.id ? hintText : null))
				: null;

			return (
				<RecursiveGroupContainer
					key={`${item.id}-child-${child.id}-${index}`}
					item={child}
					treeManager={treeManager}
					onSubmit={isFrozen || child.frozen ? undefined : onSubmit}
					onBack={isFrozen || child.frozen ? undefined : onBack}
					onHintChange={isFrozen || child.frozen ? undefined : onHintChange}
					hintText={childHintText}
					showOnlyActiveAndCompleted={
						showOnlyActiveAndCompleted ||
						(item.completed && !item.active)
					}
					isFrozen={isFrozen || child.frozen}
					hintsByPromptId={hintsByPromptId}
				/>
			);
		});

		// For root node, check if there's a custom root container
		// If so, use it instead of the group plugin (to allow ask component to control layout)
		const isRootNode = item.id === "root" && item.depth === 0;
		const CustomRootContainer = isRootNode
			? (globalThis as any).__customRootContainer
			: null;

		// If custom root container exists for root node, use it directly
		if (CustomRootContainer && isRootNode) {
			// Separate regular children from cancel prompts
			const regularChildren: React.ReactNode[] = [];
			const cancelChildren: React.ReactNode[] = [];

			// Split rendered children based on whether they are cancel prompts
			renderedChildren.forEach((renderedChild, index) => {
				const correspondingChild = childrenToRender[index];
				if (correspondingChild?.isCancelPrompt) {
					cancelChildren.push(renderedChild);
				} else {
					regularChildren.push(renderedChild);
				}
			});

			return (
				<CustomRootContainer onCancelNodes={cancelChildren}>
					{regularChildren}
				</CustomRootContainer>
			);
		}

		// Otherwise, render group through plugin system
		// Hint text is displayed by the active field itself, not at group level
		return (
			<PluginWrapper
				pluginType="group"
				key={`group-${item.id}-${groupState}`}
				{...item.properties} // Spread all properties including hideOnCompletion
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
		if (isCompleted && item.hideOnCompletion) {
			return null;
		}

		// For showOnlyActiveAndCompleted mode, only show active or completed fields
		if (showOnlyActiveAndCompleted && !isActive && !isCompleted) {
			return null;
		}

		// Determine hint text for this specific field node
		const fieldHintText = item.active
			? (hintsByPromptId?.get(item.id) || hintText)
			: null;

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

		// Check if this is the first user-interactive prompt in the root flow
		// Cannot go back on the first user-interactive prompt (auto-submit prompts don't count)
		const isFirstInteractivePrompt = () => {
			// Helper to check if a node requires user interaction (not auto-submit)
			const requiresUserInteraction = (node: PromptNode) => {
				if (node.type === "group") return false; // Groups don't require user interaction
				if (!node.fieldType) return false;
				return !globalRegistry.shouldAutoSubmit(node.fieldType);
			};

			// Helper to check if a group contains any user-interactive prompts
			const groupHasInteractive = (group: PromptNode): boolean => {
				return group.children.some(
					(child) =>
						requiresUserInteraction(child) ||
						(child.type === "group" && groupHasInteractive(child))
				);
			};

			// Case 1: Direct child of root
			if (parent?.id === "root") {
				// Check if there are any user-interactive prompts before this one
				const siblingsBefore = parent.children.slice(0, siblingIndex);
				const hasInteractiveBefore = siblingsBefore.some(
					(sibling) =>
						requiresUserInteraction(sibling) ||
						(sibling.type === "group" &&
							groupHasInteractive(sibling))
				);
				return !hasInteractiveBefore;
			}

			// Case 2: Inside a group at root level
			if (parent?.type === "group" && parent.parent?.id === "root") {
				const groupIndex = parent.parent.children.indexOf(parent);

				// Check siblings before this one in the same group
				const siblingsBefore = parent.children.slice(0, siblingIndex);
				if (siblingsBefore.some(requiresUserInteraction)) {
					return false;
				}

				// Check if there are user-interactive prompts in previous root-level items
				const rootSiblingsBefore = parent.parent.children.slice(
					0,
					groupIndex
				);
				const hasInteractiveBefore = rootSiblingsBefore.some(
					(sibling) =>
						requiresUserInteraction(sibling) ||
						(sibling.type === "group" &&
							groupHasInteractive(sibling))
				);
				return !hasInteractiveBefore;
			}

			// Case 3: Nested groups - can always go back
			return false;
		};

		const isFirstRootPrompt = isFirstInteractivePrompt();

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

		// Compute effective allowBack based on:
		// 1. Node's explicit allowBack setting
		// 2. First root prompt check
		// 3. Previous node's submission type
		const computeEffectiveAllowBack = (): boolean => {
			// If explicitly set to false, respect it
			if (item.allowBack === false) return false;

			// First interactive prompt can't go back
			if (isFirstRootPrompt) return false;

			// Check if back navigation should be allowed based on previous node's submission type
			const canGoBackBasedOnHistory =
				treeManager.canGoBackBasedOnSubmissionType();

			// If previous node was auto-submitted (and doesn't explicitly allow back), prevent navigation
			if (!canGoBackBasedOnHistory) return false;

			// Default: allow back (node.allowBack is either true or undefined)
			return true;
		};

		const effectiveAllowBack = computeEffectiveAllowBack();

		// Special handling for completedFields plugin to avoid Box wrapper when empty
		if (item.fieldType === "completedFields") {
			return (
				<PluginWrapper
					pluginType={item.fieldType}
					promptId={item.id} // Pass the prompt ID so auto-submissions can capture it
					key={`plugin-${item.id}-${item.depth}-${pluginState}`}
					{...item.properties} // Spread all plugin properties
					message={item.properties.message || item.label || ""}
					initialValue={getInitialValue()}
					state={pluginState}
					completedValue={isCompleted ? item.value : undefined}
					onSubmit={isActive && !isFrozen && !item.frozen ? onSubmit : () => {}}
					onBack={isActive && !isFrozen && !item.frozen ? onBack : undefined}
					allowBack={effectiveAllowBack}
					flow={flowType}
					isFirstInGroup={isFirstInGroup}
					isLastInGroup={isLastInGroup}
					isFirstRootPrompt={isFirstRootPrompt}
					enableArrowNavigation={parent?.enableArrowNavigation}
					{...(isActive && !isFrozen && !item.frozen && onHintChange && { onHintChange })}
				/>
			);
		}

		return (
			<Box flexDirection="column">
				<PluginWrapper
					pluginType={item.fieldType}
					promptId={item.id} // Pass the prompt ID so auto-submissions can capture it
					key={`plugin-${item.id}-${item.depth}-${pluginState}`}
					{...item.properties} // Spread all plugin properties
					message={item.properties.message || item.label || ""}
					initialValue={getInitialValue()}
					state={pluginState}
					completedValue={isCompleted ? item.value : undefined}
					onSubmit={isActive && !isFrozen && !item.frozen ? onSubmit : () => {}}
					onBack={isActive && !isFrozen && !item.frozen ? onBack : undefined}
					allowBack={effectiveAllowBack}
					flow={flowType}
					isFirstInGroup={isFirstInGroup}
					isLastInGroup={isLastInGroup}
					isFirstRootPrompt={isFirstRootPrompt}
					enableArrowNavigation={parent?.enableArrowNavigation}
					{...(isActive && !isFrozen && !item.frozen && onHintChange && { onHintChange })}
				/>
				{/* Always render hint area for active fields to prevent layout shift */}
				{/* Show hint text for active fields, including frozen ones that should preserve their hint */}
				{/* Don't show hint text for note and other auto-submitting fields since they don't need navigation hints */}
				{isActive && item.fieldType !== "note" && !globalRegistry.shouldAutoSubmit(item.fieldType || '') && <HintText>{fieldHintText || " "}</HintText>}
			</Box>
		);
	}

	// Fallback for unknown types
	return null;
}
