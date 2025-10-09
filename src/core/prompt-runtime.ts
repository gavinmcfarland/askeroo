/**
 * PromptRuntime - Main runtime class for executing prompt flows
 *
 * Orchestrates interactive CLI prompts with clean state management,
 * navigation, discovery, and plugin integration.
 */

import { debugLogger } from "../utils/logging.js";
import { globalRegistry } from "./registry.js";
import {
	PromptKind,
	PromptOpts,
	GroupMeta,
	GroupOpts,
	UI,
	BackToken,
	Engine,
} from "../types/index.js";
import { IdGenerator } from "./id-generator.js";
import { RuntimeState } from "./runtime-state.js";
import { FieldDiscoveryService } from "./discovery-service.js";
import { PromptTreeManager } from "./prompt-tree.js";

const BACK: BackToken = { __back: true };

export class PromptRuntime {
	// Core services
	private idGenerator: IdGenerator;
	private state: RuntimeState;
	private fieldDiscovery: FieldDiscoveryService;
	private ui: UI;
	private tree: PromptTreeManager; // For UI visualization

	// Engine for step execution
	private engine: Engine;

	// Plugin prompt functions
	private pluginPrompts: Record<string, any> = {};

	// Cancel handling
	private cancelCallbacks: Array<() => void> = [];
	private sigintHandler: (() => void) | null = null;

	// Public BACK token
	public readonly BACK = BACK;

	constructor(ui: UI) {
		debugLogger.log("RUNTIME_CREATE", { ui: typeof ui });

		this.ui = ui;
		this.idGenerator = new IdGenerator();
		this.state = new RuntimeState();
		this.tree = new PromptTreeManager();
		this.fieldDiscovery = new FieldDiscoveryService(this.state);

		// Create engine with bound methods
		this.engine = {
			BACK,
			step: this.processPromptStep.bind(this),
		};

		// Create dynamic prompt functions for plugins
		this.initializePluginPrompts();

		// Set runtime reference in UI for re-discovery
		this.ui.setRuntime?.(this);

		// Set up SIGINT handler immediately so Ctrl+C always works
		this.setupCancelHandler();
	}

	// ========== PUBLIC API ==========

	/**
	 * Execute a prompt flow
	 */
	async executeFlow<T>(
		flowDefinition: (
			api: {
				BACK: BackToken;
			} & Record<string, any>
		) => Promise<T>
	): Promise<T> {
		debugLogger.log("FLOW_START", {
			currentIndex: this.state.getCurrentPromptIndex(),
			answersCount: this.state.getAnswerCount(),
		});

		try {
			while (true) {
				// Prepare for replay
				this.state.prepareForReplay();
				this.idGenerator.reset();

				try {
					this.state.beginFlowExecution();
					debugLogger.log("FLOW_EXECUTING", {
						isReplaying: this.state.isReplayingAnswers(),
						currentIndex: this.state.getCurrentPromptIndex(),
					});

					const result = await flowDefinition({
						BACK,
						...this.pluginPrompts,
					});

					this.state.endFlowExecution();

					// If we've reached the end, we're done
					if (this.state.hasReachedEndOfFlow()) {
						debugLogger.log("FLOW_COMPLETE", {
							result,
							totalPrompts: this.state.getTotalPromptCount(),
						});

						// Notify UI that the flow is complete
						this.ui.completeFlow?.();

						// Add a small delay to allow the completion state to update
						await new Promise((resolve) =>
							setTimeout(resolve, 100)
						);

						this.ui.cleanup?.();
						return result;
					}
				} catch (e) {
					this.state.endFlowExecution();

					if (e === BACK) {
						debugLogger.log("NAVIGATION_BACK", {
							currentIndex: this.state.getCurrentPromptIndex(),
							totalPrompts: this.state.getTotalPromptCount(),
						});

						// Go back one step
						if (this.state.getCurrentPromptIndex() > 0) {
							this.state.returnToPreviousPrompt();
							this.state.clearAnswersAfterCurrentPosition();
							this.tree.clearFutureAnswers(
								this.state.getCurrentPromptIndex()
							);

							debugLogger.log("BACK_NAVIGATION_STATE", {
								newIndex: this.state.getCurrentPromptIndex(),
								remainingAnswers: this.state.getAnswerCount(),
							});
						}
					} else {
						throw e;
					}
				}

				// Clean up answers for prompts that were not reached in this replay
				this.state.clearUnreachableAnswers();
				this.tree.clearUnreachableAnswers();
			}
		} finally {
			// Always clean up the SIGINT handler when flow ends
			this.cleanupCancelHandler();
		}
	}

	/**
	 * Ask a prompt question (wrapper for executeFlow compatibility)
	 */
	async ask(opts: PromptOpts): Promise<any> {
		if (!this.state.isExecutingFlow()) {
			throw new Error("ask() must be called inside executeFlow()");
		}

		return this.engine.step(
			opts.message ? "text" : "confirm",
			opts,
			async (id) => {
				const currentGroup = this.state.getCurrentGroupId();
				return this.ui[opts.message ? "text" : "confirm"](
					opts,
					currentGroup,
					id
				);
			}
		);
	}

	/**
	 * Create a group of prompts (public API wrapper)
	 */
	/**
	 * Create a group of prompts (called by the group plugin)
	 *
	 * Note: The public group() API is now exposed through the group plugin.
	 * This method is called internally by the plugin to handle group execution.
	 */
	async group(
		meta: GroupMeta,
		body: () => Promise<any>,
		opts?: GroupOpts
	): Promise<any> {
		return this.createGroup(meta, body, opts);
	}

	/**
	 * Create a group of prompts (internal implementation)
	 */
	async createGroup(
		meta: GroupMeta,
		body: () => Promise<any>,
		opts?: GroupOpts
	): Promise<any> {
		// Group creation logic

		if (!this.state.isExecutingFlow()) {
			throw new Error("group() must be called inside executeFlow()");
		}

		// Combine meta and opts
		const combinedOpts = { ...meta, ...(opts || {}) };

		// For static groups, pre-scan to find fields
		if (opts?.flow === "static") {
			const nextGroupCount = this.idGenerator.getGroupCount() + 1;
			const groupId = this.idGenerator.generateGroupId({
				groupStack: this.state.getGroupHierarchy(),
				groupCount: nextGroupCount,
				flowType: combinedOpts.flow,
				customId: combinedOpts.id,
			});

			// Store the body function for re-scanning
			this.fieldDiscovery.storeGroupBodyFunction(groupId, body);

			// Run field scanning
			await this.fieldDiscovery.scanGroupFields(groupId, body);
		}

		await this.engine.step("group", combinedOpts, async () => undefined);

		try {
			const result = await body();

			// Mark the group as completed when body finishes successfully
			// We need to get the current group ID before we exit it
			const completedGroupId = this.state.getCurrentGroupId();

			if (completedGroupId) {
				// Groups are stored in UI tree, not runtime tree
				// Runtime and UI maintain separate tree instances
				// So we need to notify UI to handle the completion
				this.ui.onGroupCompleted?.(completedGroupId);
			}

			return result;
		} finally {
			// Exit the group when the group body completes
			this.state.exitGroup();
			this.ui.clearGroup?.();
		}
	}

	/**
	 * Execute group body (called by group plugin)
	 * This is the main entry point for the group plugin's execute hook
	 */
	async executeGroupBody(opts: any, body: () => Promise<any>): Promise<any> {
		const meta: GroupMeta = {
			label: opts.label,
			id: opts.id,
		};

		const groupOpts: GroupOpts = {
			flow: opts.flow,
			enableArrowNavigation: opts.enableArrowNavigation,
			hideOnCompletion: opts.hideOnCompletion,
		};

		return this.createGroup(meta, body, groupOpts);
	}

	/**
	 * Re-scan fields for a static group
	 * Used by UI for field re-rendering
	 */
	async rescanStaticGroupFields(groupId: string) {
		return this.fieldDiscovery.rescanGroupFields(groupId);
	}

	// ========== INTERNAL METHODS ==========

	/**
	 * Process a single prompt step - handles both groups and fields
	 */
	private async processPromptStep<T>(
		kind: PromptKind,
		opts: PromptOpts | (GroupMeta & GroupOpts),
		askUserFunction: (id: string) => Promise<T | BackToken>
	): Promise<T> {
		debugLogger.log("PROMPT_STEP", {
			kind,
			opts,
			currentIndex: this.state.getCurrentPromptIndex(),
			groupStack: this.state.getGroupHierarchy(),
			isReplaying: this.state.isReplayingAnswers(),
		});

		if (kind === "group") {
			return this.handleGroupStep(
				opts as GroupMeta & GroupOpts,
				askUserFunction
			);
		}

		return this.handleFieldStep(kind, opts as PromptOpts, askUserFunction);
	}

	/**
	 * Handle a group step
	 */
	private async handleGroupStep<T>(
		groupOpts: GroupMeta & GroupOpts,
		askUserFunction: (id: string) => Promise<T | BackToken>
	): Promise<T> {
		// Increment group count for stable ID generation
		const groupCount = this.idGenerator.incrementGroupCount();

		const groupId = this.idGenerator.generateGroupId({
			groupStack: this.state.getGroupHierarchy(),
			groupCount,
			flowType: groupOpts.flow,
			customId: groupOpts.id,
		});

		// Show group if not already processed
		const shouldShowGroup = !this.state.isGroupProcessed(groupId);

		if (shouldShowGroup) {
			debugLogger.log("GROUP_SHOW", {
				groupId,
				groupLabel: groupOpts.label,
				flow: groupOpts.flow,
			});

			const fields =
				groupOpts.flow === "static"
					? this.fieldDiscovery.getDiscoveredFields(groupId)
					: undefined;

			const groupDepth = this.state.getGroupDepth();
			const currentGroup = this.state.getCurrentGroupId();

			await this.ui.showGroup?.(
				groupOpts.label,
				groupOpts.flow || "progressive",
				groupId,
				fields,
				groupOpts.enableArrowNavigation,
				groupDepth,
				currentGroup,
				groupOpts // Pass all group options including hideOnCompletion
			);

			this.state.markGroupAsProcessed(groupId);
			await askUserFunction(groupId);
		} else {
			debugLogger.log("GROUP_SKIP", {
				groupId,
				groupLabel: groupOpts.label,
				isReplaying: this.state.isReplayingAnswers(),
			});
		}

		// Enter group context
		this.state.enterGroup(groupId);
		return undefined as T;
	}

	/**
	 * Handle a field step
	 */
	private async handleFieldStep<T>(
		kind: PromptKind,
		opts: PromptOpts,
		askUserFunction: (id: string) => Promise<T | BackToken>
	): Promise<T> {
		const stepIndex = this.state.getTotalPromptCount();

		// Generate stable, deterministic ID
		const customId = "id" in opts ? opts.id : undefined;
		const message: string =
			("message" in opts && opts.message ? opts.message : undefined) ||
			("label" in opts && (opts as any).label
				? (opts as any).label
				: undefined) ||
			`${kind}-${stepIndex}`;

		const promptId = this.idGenerator.generateFieldId({
			kind,
			message,
			groupStack: this.state.getGroupHierarchy(),
			stepIndex,
			customId,
		});

		// In field scanning mode, just track the field
		if (this.fieldDiscovery.isCurrentlyScanning()) {
			return this.handleFieldDuringScanning(promptId, kind, message);
		}

		this.state.registerPrompt(promptId);

		// If we have an answer and we're replaying past this step, use it
		if (
			stepIndex < this.state.getCurrentPromptIndex() &&
			this.state.hasStoredAnswer(promptId)
		) {
			const answer = this.state.retrieveAnswer(promptId);
			debugLogger.log("PROMPT_REPLAY", {
				id: promptId,
				stepIndex,
				currentIndex: this.state.getCurrentPromptIndex(),
				answer,
			});
			return answer as T;
		}

		// If this is the current step, ask the user
		if (stepIndex === this.state.getCurrentPromptIndex()) {
			return await this.promptUserForAnswer(
				promptId,
				stepIndex,
				askUserFunction
			);
		}

		// If we have a cached answer, use it
		if (this.state.hasStoredAnswer(promptId)) {
			const answer = this.state.retrieveAnswer(promptId);
			debugLogger.log("PROMPT_CACHED", {
				id: promptId,
				stepIndex,
				answer,
			});
			return answer as T;
		}

		// Fallback: ask user
		const result = await askUserFunction(promptId);
		if (this.isBackToken(result)) throw BACK;
		this.state.storeAnswer(promptId, result);
		this.state.setPromptIndex(stepIndex + 1);
		return result as T;
	}

	/**
	 * Handle field registration during scanning mode
	 */
	private handleFieldDuringScanning<T>(
		promptId: string,
		kind: PromptKind,
		message: string
	): T {
		const currentGroupId = this.state.getCurrentGroupId();
		debugLogger.log("DISCOVERY_FIELD", {
			currentGroupId,
			id: promptId,
			label: message,
			kind,
		});

		if (currentGroupId) {
			this.fieldDiscovery.registerDiscoveredField(currentGroupId, {
				id: promptId,
				label: message || `${kind} field`,
				type: kind,
			});
		}

		// Use current field value if available, otherwise use placeholder
		if (this.state.hasStoredAnswer(promptId)) {
			const currentValue = this.state.retrieveAnswer(promptId);
			debugLogger.log("DISCOVERY_CURRENT_VALUE", {
				id: promptId,
				currentValue,
			});
			return currentValue as T;
		}

		// Use smart placeholder for discovery
		const placeholderValue: any = false;

		debugLogger.log("DISCOVERY_PLACEHOLDER", {
			kind,
			label: message,
			placeholderValue,
		});
		return placeholderValue as T;
	}

	/**
	 * Prompt the user for an answer
	 */
	private async promptUserForAnswer<T>(
		promptId: string,
		stepIndex: number,
		askUserFunction: (id: string) => Promise<T | BackToken>
	): Promise<T> {
		debugLogger.log("PROMPT_ASK", {
			id: promptId,
			stepIndex,
		});

		const result = await askUserFunction(promptId);

		if (this.isBackToken(result)) {
			debugLogger.log("PROMPT_BACK", { id: promptId, stepIndex });
			throw BACK;
		}

		debugLogger.log("PROMPT_ANSWER", { id: promptId, stepIndex, result });

		this.state.storeAnswer(promptId, result);

		// Also update tree for UI visualization
		const node = this.tree.getNode(promptId);
		if (node) {
			this.tree.updateNode(promptId, { value: result });
		}

		this.state.advanceToNextPrompt();

		// Check if this was the last field
		if (this.state.hasReachedEndOfFlow()) {
			debugLogger.log("LAST_FIELD_COMPLETE", {
				id: promptId,
				stepIndex,
				totalPrompts: this.state.getTotalPromptCount(),
			});
			this.ui.completeFlow?.();
		}
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
				if (!this.state.isExecutingFlow()) {
					throw new Error(
						`${plugin.type}() must be called inside executeFlow()`
					);
				}

				return this.engine.step(plugin.type, opts, async (id) => {
					const currentGroup = this.state.getCurrentGroupId();
					// If plugin has a transform function, use it to process opts
					// Otherwise, just pass opts through unchanged
					const processedOpts = plugin.transform
						? plugin.transform(opts, { currentGroup }, id)
						: opts;
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
	private isBackToken<T>(x: T | BackToken): x is BackToken {
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
	getDebugInfo() {
		return {
			state: this.state.getDebugInfo(),
			tree: {
				nodeCount: this.tree.getTree().nodeIndex.size,
				historyLength: this.tree.getNavigationPath().length,
				activeNode: this.tree.getActiveNode()?.id,
			},
			fieldDiscovery: this.fieldDiscovery.getDebugInfo(),
			idGenerator: {
				groupCount: this.idGenerator.getGroupCount(),
			},
		};
	}

	/**
	 * Set up SIGINT handler to call cancel callbacks when Ctrl+C is pressed
	 */
	private setupCancelHandler(): void {
		// Only set up if not already registered
		if (this.sigintHandler) {
			return;
		}

		this.sigintHandler = () => {
			debugLogger.log("FLOW_CANCELLED", {
				callbackCount: this.cancelCallbacks.length,
			});

			// Call all registered cancel callbacks
			for (const callback of this.cancelCallbacks) {
				try {
					callback();
				} catch (error) {
					debugLogger.log("CANCEL_CALLBACK_ERROR", {
						error:
							error instanceof Error
								? error.message
								: String(error),
					});
				}
			}

			// Clean up UI
			try {
				this.ui.cleanup?.();
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			// Force exit after a brief delay to allow console output to flush
			setTimeout(() => {
				process.exit(0);
			}, 50);
		};

		// Register SIGINT handler - use prependListener to run BEFORE Ink's handler
		process.prependListener("SIGINT", this.sigintHandler);
	}

	/**
	 * Clean up SIGINT handler and cancel callbacks
	 */
	private cleanupCancelHandler(): void {
		if (this.sigintHandler) {
			process.off("SIGINT", this.sigintHandler);
			this.sigintHandler = null;
		}
		this.cancelCallbacks = [];
	}

	/**
	 * Register a cancel callback
	 */
	registerCancelCallback(callback: () => void): void {
		this.cancelCallbacks.push(callback);
	}

	/**
	 * Handle Ctrl+C from UI (called by useInput hook in PromptApp)
	 */
	handleCtrlC(): void {
		// Call all registered cancel callbacks
		for (const callback of this.cancelCallbacks) {
			try {
				callback();
			} catch (error) {
				debugLogger.log("CANCEL_CALLBACK_ERROR", {
					error:
						error instanceof Error ? error.message : String(error),
				});
			}
		}

		// Clean up UI
		try {
			this.ui.cleanup?.();
		} catch (cleanupError) {
			// Ignore cleanup errors
		}

		// Force exit after a brief delay to allow console output to flush
		setTimeout(() => {
			process.exit(0);
		}, 50);
	}
}
