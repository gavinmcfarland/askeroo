import { debugLogger } from "./utils/logging.js";
import { globalRegistry, setCurrentRuntime } from "./registry.js";
import {
	PromptKind,
	PromptOpts,
	GroupMeta,
	GroupOpts,
	UI,
	BackToken,
	Engine,
} from "./types/index.js";
import { IdGenerator } from "./core/IdGenerator.js";
import { RuntimeState } from "./core/RuntimeState.js";

const BACK: BackToken = { __back: true };

export function createRuntime(ui: UI) {
	debugLogger.log("RUNTIME_CREATE", { ui: typeof ui });

	// Use the UI directly - dynamic handlers are created in ui.tsx
	const extendedUI = ui;

	// ID generator for stable, deterministic IDs
	const idGenerator = new IdGenerator();

	// Runtime state manager
	const state = new RuntimeState();

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
				currentStep: state.getCurrentStep(),
				groupStack: state.getGroupStack(),
				isReplaying: state.isReplaying(),
			});

			if (kind === "group") {
				const groupOpts = opts as GroupMeta & GroupOpts;

				// Increment group count for stable ID generation
				const groupCount = idGenerator.incrementGroupCount();

				const groupId = idGenerator.generateGroupId({
					groupStack: state.getGroupStack(),
					groupCount,
					flowType: groupOpts.flow,
					customId: groupOpts.id,
				});
				let shouldShowGroup: boolean;

				// Group flow type is stored in tree when group is added to UI
				// No need to track separately - tree already has this info

				// Simplified logic - show group if not already processed
				shouldShowGroup = !state.isGroupProcessed(groupId);

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
					const groupDepth = state.getGroupDepth();
					const currentGroup = state.getCurrentGroup(); // Parent group for nesting
					await extendedUI.showGroup?.(
						groupOpts.label,
						groupOpts.flow || "progressive",
						groupId,
						fields,
						groupOpts.enableArrowNavigation,
						groupDepth,
						currentGroup
					);
					state.markGroupAsProcessed(groupId);
					// Call askFn to create the interactive prompt
					await askFn(groupId);
				} else {
					debugLogger.log("GROUP_SKIP", {
						groupId,
						groupLabel: groupOpts.label,
						shouldShowGroup,
						isReplaying: state.isReplaying(),
					});
				}

				// Group depth is stored in tree - no need to track separately
				state.pushGroup(groupId);
				return undefined as T;
			}

			// This is an interactive prompt
			const stepIndex = state.getCurrentPromptIndex();

			// Generate stable, deterministic ID
			const customId = "id" in opts ? opts.id : undefined;
			const message =
				("message" in opts ? opts.message : undefined) ||
				("label" in opts ? opts.label : undefined) ||
				`${kind}-${stepIndex}`;

			const id = idGenerator.generateFieldId({
				kind,
				message,
				groupStack: state.getGroupStack(),
				stepIndex,
				customId,
			});

			// In discovery mode, just track the field and return current value or placeholder
			if (isDiscoveryMode) {
				const currentGroupId = state.getCurrentGroup();
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
				if (state.hasAnswer(id)) {
					const currentValue = state.getAnswer(id);
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

			state.addPrompt(id);

			// If we already have an answer and we're replaying past this step, use it
			if (stepIndex < state.getCurrentStep() && state.hasAnswer(id)) {
				debugLogger.log("PROMPT_REPLAY", {
					id,
					stepIndex,
					currentStep: state.getCurrentStep(),
					answer: state.getAnswer(id),
				});
				return state.getAnswer(id) as T;
			}

			// If this is the current step to ask, prompt the user
			if (stepIndex === state.getCurrentStep()) {
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
				state.addAnswer(id, result);
				state.incrementStep();

				// Check if this was the last field and notify UI immediately
				if (state.getCurrentStep() >= state.getPromptCount()) {
					debugLogger.log("LAST_FIELD_COMPLETE", {
						id,
						stepIndex,
						totalSteps: state.getPromptCount(),
					});
					// Notify UI that the flow is complete so the last field can be marked as completed immediately
					extendedUI.completeFlow?.();
				}

				return result as T;
			}

			// If we have an answer for this step, use it
			if (state.hasAnswer(id)) {
				debugLogger.log("PROMPT_CACHED", {
					id,
					stepIndex,
					answer: state.getAnswer(id),
				});
				return state.getAnswer(id) as T;
			}

			// This shouldn't happen in normal flow, but handle it defensively
			const result = await askFn(id);
			if (isBack(result)) throw BACK;
			state.addAnswer(id, result);
			state.setStep(stepIndex + 1);
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
		const nextGroupCount = idGenerator.getGroupCount() + 1;
		const discoveryGroupId = idGenerator.generateGroupId({
			groupStack: state.getGroupStack(),
			groupCount: nextGroupCount,
			flowType: opts.flow,
			customId: (opts as any).id,
		});

		isDiscoveryMode = true;
		debugLogger.log("DISCOVERY_START", {
			groupId: discoveryGroupId,
			groupStack: state.getGroupStack(),
		});

		// Push group to stack temporarily for discovery
		state.pushGroup(discoveryGroupId);

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
			state.popGroup();
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
		if (!state.isAsking())
			throw new Error("group() must be called inside ask()");

		// Combine meta and opts for the engine step
		const combinedOpts = { ...meta, ...(opts || {}) };

		// For static groups, we need to run discovery to find fields
		if (opts?.flow === "static") {
			const nextGroupCount = idGenerator.getGroupCount() + 1;
			const groupId = idGenerator.generateGroupId({
				groupStack: state.getGroupStack(),
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
			state.popGroup();
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
			currentStep: state.getCurrentStep(),
			answersCount: state.getAnswerCount(),
		});

		while (true) {
			// Simplified navigation - always do full replay for consistency
			state.resetForReplay();
			idGenerator.reset();

			try {
				state.setAsking(true);
				debugLogger.log("FLOW_START", {
					isReplaying: state.isReplaying(),
					currentStep: state.getCurrentStep(),
				});
				const result = await flow({
					group,
					BACK,
					...pluginPrompts,
				});
				state.setAsking(false);

				// If we've asked all interactive prompts in this path, we're done
				if (state.getCurrentStep() >= state.getPromptCount()) {
					debugLogger.log("FLOW_COMPLETE", {
						result,
						totalSteps: state.getPromptCount(),
					});

					// Notify UI that the flow is complete so all fields can be marked as completed
					extendedUI.completeFlow?.();

					// Add a small delay to allow the completion state to update
					await new Promise((resolve) => setTimeout(resolve, 100));

					extendedUI.cleanup?.();
					return result;
				}
			} catch (e) {
				state.setAsking(false);
				if (e === BACK) {
					debugLogger.log("NAVIGATION_BACK", {
						currentStep: state.getCurrentStep(),
						totalSteps: state.getPromptCount(),
					});
					// Go back one step
					if (state.getCurrentStep() > 0) {
						state.decrementStep();

						// Clear future answers - will be rebuilt on next replay
						state.clearFutureAnswers();

						debugLogger.log("BACK_NAVIGATION_STATE", {
							newStep: state.getCurrentStep(),
							remainingAnswers: state.getAnswerCount(),
						});

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
			state.clearUnreachableAnswers();
		}
	}

	// Create dynamic prompt functions for plugins
	const pluginPrompts: Record<string, any> = {};
	for (const plugin of globalRegistry.getAll()) {
		pluginPrompts[plugin.type] = async function (opts: any): Promise<any> {
			if (!state.isAsking())
				throw new Error(`${plugin.type}() must be called inside ask()`);
			return engine.step(plugin.type, opts, async (id) => {
				const currentGroup = state.getCurrentGroup();
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
			state.pushGroup(groupId);

			try {
				await body();
			} catch (e) {
				debugLogger.log("REDISCOVERY_ERROR", { groupId, error: e });
			} finally {
				state.popGroup();
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
