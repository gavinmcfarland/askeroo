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
import { FlowController } from "./FlowController.js"; // MICRO STEP 5.2: Import FlowController
import { DiscoveryService } from "./DiscoveryService.js";
import { PromptTreeManager } from "./PromptTree.js";

const BACK: BackToken = { __back: true };

export class PromptRuntime {
	// Core services
	private idGenerator: IdGenerator;
	private state: RuntimeState;
	private flow: FlowController; // MICRO STEP 5.2: Flow control (separate from data)
	private discovery: DiscoveryService;
	private ui: UI;
	private tree: PromptTreeManager; // NEW: Tree-based state management

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
		this.flow = new FlowController(); // MICRO STEP 5.2: Initialize flow controller
		this.tree = new PromptTreeManager(); // NEW: Initialize tree
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
			currentStep: this.getCurrentStepBoth(), // MICRO STEP 3.2: Use wrapper
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
					currentStep: this.getCurrentStepBoth(), // MICRO STEP 3.3: Use wrapper
				});

				const result = await flow({
					group: this.group.bind(this),
					BACK,
					...this.pluginPrompts,
				});

				this.state.setAsking(false);

				// If we've asked all interactive prompts in this path, we're done
				if (
					this.getCurrentStepBoth() >= this.state.getPromptCount() // MICRO STEP 3.4: Use wrapper
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
						currentStep: this.getCurrentStepBoth(), // MICRO STEP 3.5a: Use wrapper
						totalSteps: this.state.getPromptCount(),
					});

					// Go back one step
					if (this.getCurrentStepBoth() > 0) {
						// MICRO STEP 3.5b: Use wrapper
						this.decrementStepBoth(); // MICRO STEP 3.5c: Use wrapper
						this.state.clearFutureAnswers();

						debugLogger.log("BACK_NAVIGATION_STATE", {
							newStep: this.getCurrentStepBoth(), // MICRO STEP 3.5d: Use wrapper
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
				groupStack: this.getGroupStackBoth(), // MICRO STEP 4.4: Use wrapper
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
			this.popGroupBoth(); // MICRO STEP 4.10: Use wrapper
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
	 * Get current group from both tree and state (for gradual migration)
	 */
	private getCurrentGroupBoth(): string | undefined {
		// Try tree first (new source)
		const treeGroup = this.tree.getCurrentGroupId();
		if (treeGroup && treeGroup !== "root") {
			return treeGroup;
		}
		// Fallback to RuntimeState (existing behavior)
		return this.state.getCurrentGroup();
	}

	/**
	 * Get group stack from both tree and state (for gradual migration)
	 */
	private getGroupStackBoth(): string[] {
		// For now, use RuntimeState
		// In future steps, we'll build this from tree parent relationships
		return this.state.getGroupStack();
	}

	/**
	 * Push a group to both systems (for gradual migration)
	 */
	private pushGroupBoth(groupId: string): void {
		// Push to RuntimeState (existing behavior)
		this.state.pushGroup(groupId);
		// Tree tracking will be added in later micro steps
	}

	/**
	 * Pop a group from both systems (for gradual migration)
	 */
	private popGroupBoth(): string | undefined {
		// Pop from RuntimeState (existing behavior)
		return this.state.popGroup();
		// Tree tracking will be added in later micro steps
	}

	/**
	 * Get current step from state (will be replaced with tree-based tracking)
	 * For now, just delegates to RuntimeState
	 */
	private getCurrentStepBoth(): number {
		// For now, just use RuntimeState
		// In future steps, we'll use tree history to calculate this
		return this.state.getCurrentStep();
	}

	/**
	 * Increment step in both systems (for gradual migration)
	 */
	private incrementStepBoth(): void {
		// Increment in RuntimeState (existing behavior)
		this.state.incrementStep();
		// Tree navigation will be added in later micro steps
	}

	/**
	 * Decrement step in both systems (for gradual migration)
	 */
	private decrementStepBoth(): void {
		// Decrement in RuntimeState (existing behavior)
		this.state.decrementStep();
		// Tree navigation will be added in later micro steps
	}

	/**
	 * Add an answer to both tree and state (for gradual migration)
	 */
	private addAnswerBoth(id: string, value: any): void {
		// Add to existing state (unchanged behavior)
		this.state.addAnswer(id, value);
		// Also add to tree (new, parallel storage)
		const node = this.tree.getNode(id);
		if (node) {
			this.tree.updateNode(id, { value });
		}
	}

	/**
	 * Get an answer from tree first, fallback to state (for gradual migration)
	 */
	private getAnswerBoth(id: string): any | undefined {
		// Try tree first (new source)
		const node = this.tree.getNode(id);
		if (node && node.value !== undefined) {
			return node.value;
		}
		// Fallback to existing state (unchanged behavior)
		return this.state.getAnswer(id);
	}

	/**
	 * Check if we have an answer in either tree or state (for gradual migration)
	 */
	private hasAnswerBoth(id: string): boolean {
		// Check tree first (new source)
		const node = this.tree.getNode(id);
		if (node && node.value !== undefined) {
			return true;
		}
		// Fallback to existing state (unchanged behavior)
		return this.state.hasAnswer(id);
	}

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
			currentStep: this.getCurrentStepBoth(), // MICRO STEP 3.6: Use wrapper
			groupStack: this.getGroupStackBoth(), // MICRO STEP 4.3: Use wrapper
			isReplaying: this.state.isReplaying(),
		});

		if (kind === "group") {
			const groupOpts = opts as GroupMeta & GroupOpts;

			// Increment group count for stable ID generation
			const groupCount = this.idGenerator.incrementGroupCount();

			const groupId = this.idGenerator.generateGroupId({
				groupStack: this.getGroupStackBoth(), // MICRO STEP 4.2: Use wrapper
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
				const currentGroup = this.getCurrentGroupBoth(); // MICRO STEP 4.7: Use wrapper

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
			this.pushGroupBoth(groupId); // MICRO STEP 4.9: Use wrapper
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
			groupStack: this.getGroupStackBoth(), // MICRO STEP 4.5: Use wrapper
			stepIndex,
			customId,
		});

		// In discovery mode, just track the field and return current value or placeholder
		if (this.discovery.inDiscoveryMode()) {
			const currentGroupId = this.getCurrentGroupBoth(); // MICRO STEP 4.6: Use wrapper
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
			if (this.hasAnswerBoth(id)) {
				// MICRO STEP 2.4: Check both sources
				const currentValue = this.getAnswerBoth(id); // MICRO STEP 2.4: Get from both sources
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
			stepIndex < this.getCurrentStepBoth() && // MICRO STEP 3.7a: Use wrapper
			this.hasAnswerBoth(id) // MICRO STEP 2.5: Check both sources
		) {
			const answer = this.getAnswerBoth(id); // MICRO STEP 2.5: Get from both sources
			debugLogger.log("PROMPT_REPLAY", {
				id,
				stepIndex,
				currentStep: this.getCurrentStepBoth(), // MICRO STEP 3.7b: Use wrapper
				answer,
			});
			return answer as T;
		}

		// If this is the current step to ask, prompt the user
		if (stepIndex === this.getCurrentStepBoth()) {
			// MICRO STEP 3.7c: Use wrapper
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
			this.addAnswerBoth(id, result); // MICRO STEP 2.2: Use both storage
			this.incrementStepBoth(); // MICRO STEP 3.8: Use wrapper

			// Check if this was the last field and notify UI immediately
			if (this.getCurrentStepBoth() >= this.state.getPromptCount()) {
				// MICRO STEP 3.9: Use wrapper
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
		if (this.hasAnswerBoth(id)) {
			// MICRO STEP 2.6: Check both sources
			const answer = this.getAnswerBoth(id); // MICRO STEP 2.6: Get from both sources
			debugLogger.log("PROMPT_CACHED", {
				id,
				stepIndex,
				answer,
			});
			return answer as T;
		}

		// This shouldn't happen in normal flow, but handle it defensively
		const result = await askFn(id);
		if (this.isBack(result)) throw BACK;
		this.addAnswerBoth(id, result); // MICRO STEP 2.3: Use both storage
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
					const currentGroup = this.getCurrentGroupBoth(); // MICRO STEP 4.8: Use wrapper
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
	 * Get the tree manager (for UI access)
	 */
	getTree(): PromptTreeManager {
		return this.tree;
	}

	/**
	 * Get current runtime state snapshot (for debugging)
	 */
	getStateSnapshot() {
		return {
			state: this.state.getSnapshot(),
			flow: this.flow.getSnapshot(), // MICRO STEP 5.2: Include flow controller
			tree: {
				nodeCount: this.tree.getTree().nodeIndex.size,
				historyLength: this.tree.getNavigationPath().length,
				activeNode: this.tree.getActiveNode()?.id,
			},
			discovery: this.discovery.getSnapshot(),
			idGenerator: {
				groupCount: this.idGenerator.getGroupCount(),
			},
		};
	}
}
