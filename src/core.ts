import { debugLogger } from "./utils/logging.js";
import { globalRegistry, setCurrentRuntime } from "./registry.js";
import {
	Answers,
	PromptKind,
	PromptOpts,
	GroupMeta,
	GroupOpts,
	UI,
	BackToken,
	Engine,
} from "./types/index.js";

const BACK: BackToken = { __back: true };

// Simple hash function for generating short, stable hashes
function simpleHash(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
	}
	return hash.toString(36);
}

// Unified ID generation for all prompt types
function generateId(
	type: "field" | "group",
	context: {
		kind?: string; // For fields: 'text', 'confirm', etc.
		message?: string; // For fields: the message/label
		groupStack: string[];
		stepIndex?: number; // For fields
		groupCount?: number; // For groups
		flowType?: string; // For groups
		customId?: string; // Explicit ID from user
	}
): string {
	// Use custom ID if provided
	if (context.customId) {
		return context.customId;
	}

	if (type === "group") {
		// Group ID: depth + index + flow
		const depth = context.groupStack.length;
		const index = context.groupCount || 0;
		const flow = context.flowType || "sequential";
		return `group_${depth}_${index}_${flow}`;
	} else {
		// Field ID: kind + group + step + message hash
		const parts: string[] = [context.kind || "field"];

		if (context.groupStack.length > 0) {
			parts.push(
				`g:${context.groupStack[context.groupStack.length - 1]}`
			);
		}

		parts.push(`s:${context.stepIndex || 0}`);

		if (context.message) {
			parts.push(`m:${simpleHash(context.message)}`);
		}

		return parts.join("|");
	}
}

export function createRuntime(ui: UI) {
	debugLogger.log("RUNTIME_CREATE", { ui: typeof ui });

	// Use the UI directly - dynamic handlers are created in ui.tsx
	const extendedUI = ui;

	// Core runtime state
	const answers: Answers = {}; // User answers for each prompt
	let interactivePrompts: string[] = []; // List of interactive prompt IDs in current flow
	let currentStep = 0; // Current step in the flow
	let asking = false; // Whether we're currently in an ask() call
	let isReplaying = false; // Whether we're replaying previous steps

	// Runtime UI interaction tracking (minimal state)
	// Note: groupStack is necessary during flow execution, before nodes are added to tree
	let groupStack: string[] = []; // Track current group nesting during flow execution
	let lastProcessedGroups: Set<string> = new Set(); // Track which groups were already processed
	let groupCount = 0; // Track total number of groups encountered for stable ID generation

	// Discovery mode for static groups (pre-scans fields before rendering)
	let isDiscoveryMode = false; // Track if we're in discovery mode for static groups
	let discoveredFields: Map<
		string,
		Array<{ id: string; label: string; type: string }>
	> = new Map(); // Track discovered fields for static groups
	let staticGroupBodies: Map<string, () => Promise<any>> = new Map(); // Store group body functions for re-discovery

	const engine: Engine = {
		BACK,
		async step<T>(
			kind: PromptKind,
			opts: PromptOpts | (GroupMeta & GroupOpts),
			askFn: (id: string) => Promise<T | BackToken>
		) {
			debugLogger.log("ENGINE_STEP", {
				kind,
				opts,
				currentStep,
				groupStack: [...groupStack],
				isReplaying,
			});

			if (kind === "group") {
				const groupOpts = opts as GroupMeta & GroupOpts;

				// Increment group count for stable ID generation
				groupCount++;

				const groupId = generateId("group", {
					groupStack,
					groupCount,
					flowType: groupOpts.flow,
					customId: groupOpts.id,
				});
				let shouldShowGroup: boolean;

				// Group flow type is stored in tree when group is added to UI
				// No need to track separately - tree already has this info

				// Simplified logic - show group if not already processed
				shouldShowGroup = !lastProcessedGroups.has(groupId);

				// Only call askFn (which creates UI prompts) if we should show the group
				if (shouldShowGroup) {
					debugLogger.log("GROUP_SHOW", {
						groupId,
						groupLabel: groupOpts.label,
						flow: groupOpts.flow,
						shouldShowGroup,
					});
					const fields =
						groupOpts.flow === "static"
							? discoveredFields.get(groupId)
							: undefined;
					const groupDepth = groupStack.length;
					const currentGroup = groupStack[groupStack.length - 1]; // Parent group for nesting
					await extendedUI.showGroup?.(
						groupOpts.label,
						groupOpts.flow || "progressive",
						groupId,
						fields,
						groupOpts.enableArrowNavigation,
						groupDepth,
						currentGroup
					);
					lastProcessedGroups.add(groupId);
					// Call askFn to create the interactive prompt
					await askFn(groupId);
				} else {
					debugLogger.log("GROUP_SKIP", {
						groupId,
						groupLabel: groupOpts.label,
						shouldShowGroup,
						isReplaying,
					});
				}

				// Group depth is stored in tree - no need to track separately
				groupStack.push(groupId);
				return undefined as T;
			}

			// This is an interactive prompt
			const stepIndex = interactivePrompts.length;

			// Generate stable, deterministic ID
			const customId = "id" in opts ? opts.id : undefined;
			const message =
				("message" in opts ? opts.message : undefined) ||
				("label" in opts ? opts.label : undefined) ||
				`${kind}-${stepIndex}`;

			const id =
				customId ??
				generateId("field", {
					kind,
					message,
					groupStack,
					stepIndex,
				});

			// In discovery mode, just track the field and return current value or placeholder
			if (isDiscoveryMode) {
				const currentGroupId = groupStack[groupStack.length - 1];
				debugLogger.log("DISCOVERY_FIELD", {
					currentGroupId,
					id,
					label: message,
					kind,
				});
				if (currentGroupId) {
					const fields = discoveredFields.get(currentGroupId) || [];
					if (!fields.some((f) => f.id === id)) {
						fields.push({
							id,
							label: message || `${kind} field`,
							type: kind,
						});
						discoveredFields.set(currentGroupId, fields);
						debugLogger.log("DISCOVERY_FIELD_ADDED", {
							currentGroupId,
							fieldCount: fields.length,
						});
					}
				}

				// Use current field value if available, otherwise use smart placeholder
				if (id in answers) {
					const currentValue = answers[id];
					debugLogger.log("DISCOVERY_CURRENT_VALUE", {
						id,
						currentValue,
					});
					return currentValue as T;
				}

				// Use smart placeholders to discover conditional fields
				let placeholderValue: any = false;

				debugLogger.log("DISCOVERY_PLACEHOLDER", {
					kind,
					label: message,
					placeholderValue,
				});
				return placeholderValue as T;
			}

			interactivePrompts.push(id);

			// If we already have an answer and we're replaying past this step, use it
			if (stepIndex < currentStep && id in answers) {
				debugLogger.log("PROMPT_REPLAY", {
					id,
					stepIndex,
					currentStep,
					answer: answers[id],
				});
				return answers[id] as T;
			}

			// If this is the current step to ask, prompt the user
			if (stepIndex === currentStep) {
				debugLogger.log("PROMPT_ASK", {
					id,
					stepIndex,
					label: message,
				});
				const result = await askFn(id);
				if (isBack(result)) {
					debugLogger.log("PROMPT_BACK", { id, stepIndex });
					throw BACK;
				}
				debugLogger.log("PROMPT_ANSWER", { id, stepIndex, result });
				answers[id] = result;
				currentStep += 1;

				// Check if this was the last field and notify UI immediately
				if (currentStep >= interactivePrompts.length) {
					debugLogger.log("LAST_FIELD_COMPLETE", {
						id,
						stepIndex,
						totalSteps: interactivePrompts.length,
					});
					// Notify UI that the flow is complete so the last field can be marked as completed immediately
					extendedUI.completeFlow?.();
				}

				return result as T;
			}

			// If we have an answer for this step, use it
			if (id in answers) {
				debugLogger.log("PROMPT_CACHED", {
					id,
					stepIndex,
					answer: answers[id],
				});
				return answers[id] as T;
			}

			// This shouldn't happen in normal flow, but handle it defensively
			const result = await askFn(id);
			if (isBack(result)) throw BACK;
			answers[id] = result;
			currentStep = stepIndex + 1;
			return result as T;
		},
	};

	function isBack<T>(x: T | BackToken): x is BackToken {
		return (
			typeof x === "object" && x !== null && (x as any).__back === true
		);
	}

	async function runStaticGroupDiscovery(
		opts: GroupOpts,
		body: () => Promise<any>
	) {
		// Pre-generate the group ID that engine.step will use
		const nextGroupCount = groupCount + 1;
		const discoveryGroupId = generateId("group", {
			groupStack,
			groupCount: nextGroupCount,
			flowType: opts.flow,
			customId: (opts as any).id,
		});

		isDiscoveryMode = true;
		debugLogger.log("DISCOVERY_START", {
			groupId: discoveryGroupId,
			groupStack: [...groupStack],
		});

		// Push group to stack temporarily for discovery
		groupStack.push(discoveryGroupId);

		try {
			// Run discovery once to find all fields
			await body();
		} catch (e) {
			debugLogger.log("DISCOVERY_ERROR", {
				groupId: discoveryGroupId,
				error: e,
			});
			// Ignore errors in discovery mode
		} finally {
			// Remove from stack after discovery
			groupStack.pop();
		}

		isDiscoveryMode = false;
		const discoveredFieldsForGroup = discoveredFields.get(discoveryGroupId);
		debugLogger.log("DISCOVERY_END", {
			groupId: discoveryGroupId,
			fields: discoveredFieldsForGroup,
		});
	}

	async function group(
		meta: GroupMeta,
		body: () => Promise<any>,
		opts?: GroupOpts
	) {
		if (!asking) throw new Error("group() must be called inside ask()");

		// Combine meta and opts for the engine step
		const combinedOpts = { ...meta, ...(opts || {}) };

		// For static groups, we need to run discovery to find fields
		if (opts?.flow === "static") {
			const nextGroupCount = groupCount + 1;
			const groupId = generateId("group", {
				groupStack,
				groupCount: nextGroupCount,
				flowType: combinedOpts.flow,
				customId: combinedOpts.id,
			});

			// Store the body function for re-discovery
			staticGroupBodies.set(groupId, body);

			await runStaticGroupDiscovery(combinedOpts, body);
		}

		await engine.step("group", combinedOpts, async () => undefined);

		try {
			return await body();
		} finally {
			// Pop the group from the stack when the group body completes
			groupStack.pop();
			extendedUI.clearGroup?.();
		}
	}

	async function ask<T>(
		flow: (
			api: {
				group: typeof group;
				BACK: BackToken;
			} & Record<string, any>
		) => Promise<T>
	): Promise<T> {
		debugLogger.log("ASK_START", {
			currentStep,
			answersCount: Object.keys(answers).length,
		});

		while (true) {
			// Simplified navigation - always do full replay for consistency
			isReplaying = currentStep > 0;
			interactivePrompts = [];
			groupStack = [];
			groupCount = 0;
			lastProcessedGroups.clear();

			try {
				asking = true;
				debugLogger.log("FLOW_START", {
					isReplaying,
					currentStep,
				});
				const result = await flow({
					group,
					BACK,
					...pluginPrompts,
				});
				asking = false;
				isReplaying = false; // Always clear replay mode after flow completes

				// If we've asked all interactive prompts in this path, we're done
				if (currentStep >= interactivePrompts.length) {
					debugLogger.log("FLOW_COMPLETE", {
						result,
						totalSteps: interactivePrompts.length,
					});

					// Notify UI that the flow is complete so all fields can be marked as completed
					extendedUI.completeFlow?.();

					// Add a small delay to allow the completion state to update
					await new Promise((resolve) => setTimeout(resolve, 100));

					extendedUI.cleanup?.();
					return result;
				}
			} catch (e) {
				asking = false;
				if (e === BACK) {
					debugLogger.log("NAVIGATION_BACK", {
						currentStep,
						totalSteps: interactivePrompts.length,
					});
					// Go back one step
					if (currentStep > 0) {
						currentStep -= 1;

						// Simplified: Remove answers from prompts after the current step
						// The next replay will rebuild the correct state
						const currentPrompts = new Set(
							interactivePrompts.slice(0, currentStep)
						);
						const answerKeys = Object.keys(answers);
						for (const key of answerKeys) {
							if (!currentPrompts.has(key)) {
								delete answers[key];
								debugLogger.log("ANSWER_REMOVED", {
									promptId: key,
									reason: "back_navigation",
								});
							}
						}

						// Note: Group state will be rebuilt on next replay
						// lastProcessedGroups is cleared at the start of each replay cycle
					} else {
						// If we're at the first step, ignore the back operation completely
					}
				} else {
					throw e;
				}
			}

			// Clean up answers for prompts that were not reached in this replay
			const reachablePrompts = new Set(interactivePrompts);
			const answerKeys = Object.keys(answers);
			for (const key of answerKeys) {
				if (!reachablePrompts.has(key)) {
					delete answers[key];
				}
			}
		}
	}

	// Create dynamic prompt functions for plugins
	const pluginPrompts: Record<string, any> = {};
	for (const plugin of globalRegistry.getAll()) {
		pluginPrompts[plugin.type] = async function (opts: any): Promise<any> {
			if (!asking)
				throw new Error(`${plugin.type}() must be called inside ask()`);
			return engine.step(plugin.type, opts, async (id) => {
				const currentGroup = groupStack[groupStack.length - 1];
				// Get the processed options from the plugin
				const processedOpts = plugin.prompt(opts, { currentGroup }, id);
				// Call the appropriate UI method based on plugin type
				return extendedUI[plugin.type](processedOpts, currentGroup, id);
			});
		};
	}

	// Re-discovery function for static groups
	async function rediscoverStaticGroupFields(groupId: string) {
		if (!isDiscoveryMode && staticGroupBodies.has(groupId)) {
			debugLogger.log("REDISCOVERY_START", { groupId });

			const body = staticGroupBodies.get(groupId)!;

			// Clear existing discovered fields for this group
			discoveredFields.delete(groupId);

			isDiscoveryMode = true;
			groupStack.push(groupId);

			try {
				await body();
			} catch (e) {
				debugLogger.log("REDISCOVERY_ERROR", { groupId, error: e });
			} finally {
				groupStack.pop();
				isDiscoveryMode = false;
			}

			const rediscoveredFields = discoveredFields.get(groupId);
			debugLogger.log("REDISCOVERY_END", {
				groupId,
				fields: rediscoveredFields,
			});
			return rediscoveredFields;
		}
		return discoveredFields.get(groupId);
	}

	const runtime = {
		ask,
		group,
		BACK,
		rediscoverStaticGroupFields,
		...pluginPrompts,
	};

	// Set the runtime context for plugins
	setCurrentRuntime(runtime);

	// Set the runtime reference in UI for re-discovery
	extendedUI.setRuntime?.(runtime);

	return runtime;
}

export { createRuntime as default };
