/**
 * PromptRuntime - Main runtime class for executing prompt flows
 *
 * This class orchestrates the entire prompt flow execution, managing state,
 * navigation, discovery, and plugin integration. It provides a clean,
 * class-based API for running interactive CLI prompts.
 */

import { debugLogger } from "../utils/logging.js";
import { globalRegistry } from "../registry.js";
import {
	PromptKind,
	PromptOpts,
	GroupMeta,
	GroupOpts,
	UI,
	BackToken,
	Engine,
} from "../types/index.js";
import { IdGenerator } from "./IdGenerator.js";
import { RuntimeState } from "./RuntimeState.js";
import { DiscoveryService } from "./DiscoveryService.js";

const BACK: BackToken = { __back: true };

export class PromptRuntime {
	// Core services
	private idGenerator: IdGenerator;
	private state: RuntimeState;
	private discovery: DiscoveryService;
	private ui: UI;

	// Engine for step execution
	private engine: Engine;

	// Plugin prompt functions
	private pluginPrompts: Record<string, any> = {};

	// Public BACK token
	public readonly BACK = BACK;

	constructor(ui: UI) {
		debugLogger.log("RUNTIME_CREATE", { ui: typeof ui });

		this.ui = ui;
		this.idGenerator = new IdGenerator();
		this.state = new RuntimeState();
		this.discovery = new DiscoveryService(this.state);

		// Create engine with bound methods
		this.engine = {
			BACK,
			step: this.step.bind(this),
		};

		// Create dynamic prompt functions for plugins
		this.initializePluginPrompts();

		// Note: setCurrentRuntime is called in createRuntime() factory with the public API object

		// Set runtime reference in UI for re-discovery
		this.ui.setRuntime?.(this);
	}

	// ========== PUBLIC API ==========

	/**
	 * Execute a prompt flow
	 */
	async ask<T>(
		flow: (
			api: {
				group: (
					meta: GroupMeta,
					body: () => Promise<any>,
					opts?: GroupOpts
				) => Promise<any>;
				BACK: BackToken;
			} & Record<string, any>
		) => Promise<T>
	): Promise<T> {
		debugLogger.log("ASK_START", {
			currentStep: this.state.getCurrentStep(),
			answersCount: this.state.getAnswerCount(),
		});

		while (true) {
			// Reset for replay
			this.state.resetForReplay();
			this.idGenerator.reset();

			try {
				this.state.setAsking(true);
				debugLogger.log("FLOW_START", {
					isReplaying: this.state.isReplaying(),
					currentStep: this.state.getCurrentStep(),
				});

				const result = await flow({
					group: this.group.bind(this),
					BACK,
					...this.pluginPrompts,
				});

				this.state.setAsking(false);

				// If we've asked all interactive prompts in this path, we're done
				if (
					this.state.getCurrentStep() >= this.state.getPromptCount()
				) {
					debugLogger.log("FLOW_COMPLETE", {
						result,
						totalSteps: this.state.getPromptCount(),
					});

					// Notify UI that the flow is complete
					this.ui.completeFlow?.();

					// Add a small delay to allow the completion state to update
					await new Promise((resolve) => setTimeout(resolve, 100));

					this.ui.cleanup?.();
					return result;
				}
			} catch (e) {
				this.state.setAsking(false);
				if (e === BACK) {
					debugLogger.log("NAVIGATION_BACK", {
						currentStep: this.state.getCurrentStep(),
						totalSteps: this.state.getPromptCount(),
					});

					// Go back one step
					if (this.state.getCurrentStep() > 0) {
						this.state.decrementStep();
						this.state.clearFutureAnswers();

						debugLogger.log("BACK_NAVIGATION_STATE", {
							newStep: this.state.getCurrentStep(),
							remainingAnswers: this.state.getAnswerCount(),
						});
					}
				} else {
					throw e;
				}
			}

			// Clean up answers for prompts that were not reached in this replay
			this.state.clearUnreachableAnswers();
		}
	}

	/**
	 * Create a group of prompts
	 */
	async group(
		meta: GroupMeta,
		body: () => Promise<any>,
		opts?: GroupOpts
	): Promise<any> {
		if (!this.state.isAsking()) {
			throw new Error("group() must be called inside ask()");
		}

		// Combine meta and opts for the engine step
		const combinedOpts = { ...meta, ...(opts || {}) };

		// For static groups, we need to run discovery to find fields
		if (opts?.flow === "static") {
			const nextGroupCount = this.idGenerator.getGroupCount() + 1;
			const groupId = this.idGenerator.generateGroupId({
				groupStack: this.state.getGroupStack(),
				groupCount: nextGroupCount,
				flowType: combinedOpts.flow,
				customId: combinedOpts.id,
			});

			// Store the body function for re-discovery
			this.discovery.storeGroupBody(groupId, body);

			// Run discovery to find all fields
			await this.discovery.discover(groupId, body);
		}

		await this.engine.step("group", combinedOpts, async () => undefined);

		try {
			return await body();
		} finally {
			// Pop the group from the stack when the group body completes
			this.state.popGroup();
			this.ui.clearGroup?.();
		}
	}

	/**
	 * Re-discover fields for a static group
	 * Used by UI for field re-rendering
	 */
	async rediscoverStaticGroupFields(groupId: string) {
		return this.discovery.rediscover(groupId);
	}

	// ========== INTERNAL METHODS ==========

	/**
	 * Engine step method - handles both groups and fields
	 */
	private async step<T>(
		kind: PromptKind,
		opts: PromptOpts | (GroupMeta & GroupOpts),
		askFn: (id: string) => Promise<T | BackToken>
	): Promise<T> {
		debugLogger.log("ENGINE_STEP", {
			kind,
			opts,
			currentStep: this.state.getCurrentStep(),
			groupStack: this.state.getGroupStack(),
			isReplaying: this.state.isReplaying(),
		});

		if (kind === "group") {
			const groupOpts = opts as GroupMeta & GroupOpts;

			// Increment group count for stable ID generation
			const groupCount = this.idGenerator.incrementGroupCount();

			const groupId = this.idGenerator.generateGroupId({
				groupStack: this.state.getGroupStack(),
				groupCount,
				flowType: groupOpts.flow,
				customId: groupOpts.id,
			});

			// Simplified logic - show group if not already processed
			const shouldShowGroup = !this.state.isGroupProcessed(groupId);

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
						? this.discovery.getDiscoveredFields(groupId)
						: undefined;
				const groupDepth = this.state.getGroupDepth();
				const currentGroup = this.state.getCurrentGroup();

				await this.ui.showGroup?.(
					groupOpts.label,
					groupOpts.flow || "progressive",
					groupId,
					fields,
					groupOpts.enableArrowNavigation,
					groupDepth,
					currentGroup
				);

				this.state.markGroupAsProcessed(groupId);
				await askFn(groupId);
			} else {
				debugLogger.log("GROUP_SKIP", {
					groupId,
					groupLabel: groupOpts.label,
					shouldShowGroup,
					isReplaying: this.state.isReplaying(),
				});
			}

			// Push group to stack
			this.state.pushGroup(groupId);
			return undefined as T;
		}

		// This is an interactive prompt
		const stepIndex = this.state.getCurrentPromptIndex();

		// Generate stable, deterministic ID
		const customId = "id" in opts ? opts.id : undefined;
		const message =
			("message" in opts ? opts.message : undefined) ||
			("label" in opts ? opts.label : undefined) ||
			`${kind}-${stepIndex}`;

		const id = this.idGenerator.generateFieldId({
			kind,
			message,
			groupStack: this.state.getGroupStack(),
			stepIndex,
			customId,
		});

		// In discovery mode, just track the field and return current value or placeholder
		if (this.discovery.inDiscoveryMode()) {
			const currentGroupId = this.state.getCurrentGroup();
			debugLogger.log("DISCOVERY_FIELD", {
				currentGroupId,
				id,
				label: message,
				kind,
			});

			if (currentGroupId) {
				this.discovery.addDiscoveredField(currentGroupId, {
					id,
					label: message || `${kind} field`,
					type: kind,
				});
			}

			// Use current field value if available, otherwise use smart placeholder
			if (this.state.hasAnswer(id)) {
				const currentValue = this.state.getAnswer(id);
				debugLogger.log("DISCOVERY_CURRENT_VALUE", {
					id,
					currentValue,
				});
				return currentValue as T;
			}

			// Use smart placeholders to discover conditional fields
			const placeholderValue: any = false;

			debugLogger.log("DISCOVERY_PLACEHOLDER", {
				kind,
				label: message,
				placeholderValue,
			});
			return placeholderValue as T;
		}

		this.state.addPrompt(id);

		// If we already have an answer and we're replaying past this step, use it
		if (
			stepIndex < this.state.getCurrentStep() &&
			this.state.hasAnswer(id)
		) {
			debugLogger.log("PROMPT_REPLAY", {
				id,
				stepIndex,
				currentStep: this.state.getCurrentStep(),
				answer: this.state.getAnswer(id),
			});
			return this.state.getAnswer(id) as T;
		}

		// If this is the current step to ask, prompt the user
		if (stepIndex === this.state.getCurrentStep()) {
			debugLogger.log("PROMPT_ASK", {
				id,
				stepIndex,
				label: message,
			});

			const result = await askFn(id);
			if (this.isBack(result)) {
				debugLogger.log("PROMPT_BACK", { id, stepIndex });
				throw BACK;
			}

			debugLogger.log("PROMPT_ANSWER", { id, stepIndex, result });
			this.state.addAnswer(id, result);
			this.state.incrementStep();

			// Check if this was the last field and notify UI immediately
			if (this.state.getCurrentStep() >= this.state.getPromptCount()) {
				debugLogger.log("LAST_FIELD_COMPLETE", {
					id,
					stepIndex,
					totalSteps: this.state.getPromptCount(),
				});
				this.ui.completeFlow?.();
			}

			return result as T;
		}

		// If we have an answer for this step, use it
		if (this.state.hasAnswer(id)) {
			debugLogger.log("PROMPT_CACHED", {
				id,
				stepIndex,
				answer: this.state.getAnswer(id),
			});
			return this.state.getAnswer(id) as T;
		}

		// This shouldn't happen in normal flow, but handle it defensively
		const result = await askFn(id);
		if (this.isBack(result)) throw BACK;
		this.state.addAnswer(id, result);
		this.state.setStep(stepIndex + 1);
		return result as T;
	}

	/**
	 * Initialize plugin prompt functions
	 */
	private initializePluginPrompts(): void {
		for (const plugin of globalRegistry.getAll()) {
			this.pluginPrompts[plugin.type] = async (
				opts: any
			): Promise<any> => {
				if (!this.state.isAsking()) {
					throw new Error(
						`${plugin.type}() must be called inside ask()`
					);
				}

				return this.engine.step(plugin.type, opts, async (id) => {
					const currentGroup = this.state.getCurrentGroup();
					const processedOpts = plugin.prompt(
						opts,
						{ currentGroup },
						id
					);
					return this.ui[plugin.type](
						processedOpts,
						currentGroup,
						id
					);
				});
			};
		}
	}

	/**
	 * Check if a value is a BACK token
	 */
	private isBack<T>(x: T | BackToken): x is BackToken {
		return (
			typeof x === "object" && x !== null && (x as any).__back === true
		);
	}

	// ========== PUBLIC ACCESSORS ==========

	/**
	 * Get plugin prompts for external access
	 */
	getPluginPrompts(): Record<string, any> {
		return this.pluginPrompts;
	}

	/**
	 * Get current runtime state snapshot (for debugging)
	 */
	getStateSnapshot() {
		return {
			state: this.state.getSnapshot(),
			discovery: this.discovery.getSnapshot(),
			idGenerator: {
				groupCount: this.idGenerator.getGroupCount(),
			},
		};
	}
}
