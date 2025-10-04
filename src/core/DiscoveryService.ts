/**
 * DiscoveryService - Handles field discovery for static groups
 *
 * Static groups need to pre-scan their fields before rendering to know what
 * fields will be shown. This service manages the discovery process, tracks
 * discovered fields, and provides re-discovery capabilities.
 */

import { debugLogger } from "../utils/logging.js";
import { RuntimeState } from "./RuntimeState.js";

export interface DiscoveredField {
	id: string;
	label: string;
	type: string;
}

export class DiscoveryService {
	// Whether we're currently in discovery mode
	private isDiscoveryMode = false;

	// Maps group ID to discovered fields
	private discoveredFields: Map<string, DiscoveredField[]> = new Map();

	// Stores group body functions for re-discovery
	private staticGroupBodies: Map<string, () => Promise<any>> = new Map();

	constructor(private state: RuntimeState) {}

	/**
	 * Check if currently in discovery mode
	 */
	inDiscoveryMode(): boolean {
		return this.isDiscoveryMode;
	}

	/**
	 * Get discovered fields for a group
	 */
	getDiscoveredFields(groupId: string): DiscoveredField[] | undefined {
		return this.discoveredFields.get(groupId);
	}

	/**
	 * Add a discovered field for a group
	 */
	addDiscoveredField(groupId: string, field: DiscoveredField): void {
		const fields = this.discoveredFields.get(groupId) || [];

		// Only add if not already present
		if (!fields.some((f) => f.id === field.id)) {
			fields.push(field);
			this.discoveredFields.set(groupId, fields);

			debugLogger.log("DISCOVERY_FIELD_ADDED", {
				groupId,
				fieldId: field.id,
				fieldCount: fields.length,
			});
		}
	}

	/**
	 * Store a group body function for later re-discovery
	 */
	storeGroupBody(groupId: string, body: () => Promise<any>): void {
		this.staticGroupBodies.set(groupId, body);
	}

	/**
	 * Check if a group has a stored body function
	 */
	hasGroupBody(groupId: string): boolean {
		return this.staticGroupBodies.has(groupId);
	}

	/**
	 * Run discovery for a static group
	 * This executes the group body in discovery mode to find all fields
	 */
	async discover(
		groupId: string,
		body: () => Promise<any>
	): Promise<DiscoveredField[]> {
		this.isDiscoveryMode = true;

		debugLogger.log("DISCOVERY_START", {
			groupId,
			groupStack: this.state.getGroupStack(),
		});

		// Push group to stack temporarily for discovery
		this.state.pushGroup(groupId);

		try {
			// Run discovery once to find all fields
			await body();
		} catch (e) {
			debugLogger.log("DISCOVERY_ERROR", {
				groupId,
				error: e,
			});
			// Ignore errors in discovery mode
		} finally {
			// Remove from stack after discovery
			this.state.popGroup();
		}

		this.isDiscoveryMode = false;

		const discoveredFieldsForGroup = this.discoveredFields.get(groupId);
		debugLogger.log("DISCOVERY_END", {
			groupId,
			fields: discoveredFieldsForGroup,
		});

		return discoveredFieldsForGroup || [];
	}

	/**
	 * Re-discover fields for a static group
	 * Used when a group needs to be re-rendered with updated fields
	 */
	async rediscover(groupId: string): Promise<DiscoveredField[] | undefined> {
		if (this.isDiscoveryMode) {
			// Already in discovery mode, skip
			return this.discoveredFields.get(groupId);
		}

		if (!this.staticGroupBodies.has(groupId)) {
			// No stored body function, return existing fields
			return this.discoveredFields.get(groupId);
		}

		debugLogger.log("REDISCOVERY_START", { groupId });

		const body = this.staticGroupBodies.get(groupId)!;

		// Clear existing discovered fields for this group
		this.discoveredFields.delete(groupId);

		this.isDiscoveryMode = true;
		this.state.pushGroup(groupId);

		try {
			await body();
		} catch (e) {
			debugLogger.log("REDISCOVERY_ERROR", { groupId, error: e });
		} finally {
			this.state.popGroup();
			this.isDiscoveryMode = false;
		}

		const rediscoveredFields = this.discoveredFields.get(groupId);
		debugLogger.log("REDISCOVERY_END", {
			groupId,
			fields: rediscoveredFields,
		});

		return rediscoveredFields;
	}

	/**
	 * Clear all discovered fields and stored bodies
	 * Typically used when resetting the runtime
	 */
	clear(): void {
		this.discoveredFields.clear();
		this.staticGroupBodies.clear();
		this.isDiscoveryMode = false;
	}

	/**
	 * Get a snapshot of the current discovery state for debugging
	 */
	getSnapshot() {
		return {
			isDiscoveryMode: this.isDiscoveryMode,
			discoveredGroupsCount: this.discoveredFields.size,
			storedBodiesCount: this.staticGroupBodies.size,
			groups: Array.from(this.discoveredFields.keys()),
		};
	}
}
