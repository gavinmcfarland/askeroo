/**
 * FieldDiscoveryService - Handles field discovery for static groups
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

export class FieldDiscoveryService {
	private isScanning = false;
	private discoveredFieldsByGroup: Map<string, DiscoveredField[]> = new Map();
	private groupBodyFunctions: Map<string, () => Promise<any>> = new Map();

	constructor(private state: RuntimeState) {}

	// ========== SCANNING STATE ==========

	isCurrentlyScanning(): boolean {
		return this.isScanning;
	}

	// ========== FIELD RETRIEVAL ==========

	getDiscoveredFields(groupId: string): DiscoveredField[] | undefined {
		return this.discoveredFieldsByGroup.get(groupId);
	}

	// ========== FIELD REGISTRATION ==========

	registerDiscoveredField(groupId: string, field: DiscoveredField): void {
		const fields = this.discoveredFieldsByGroup.get(groupId) || [];

		// Only add if not already present
		if (!fields.some((f) => f.id === field.id)) {
			fields.push(field);
			this.discoveredFieldsByGroup.set(groupId, fields);

			debugLogger.log("DISCOVERY_FIELD_ADDED", {
				groupId,
				fieldId: field.id,
				fieldCount: fields.length,
			});
		}
	}

	// ========== GROUP BODY STORAGE ==========

	storeGroupBodyFunction(groupId: string, body: () => Promise<any>): void {
		this.groupBodyFunctions.set(groupId, body);
	}

	hasStoredBodyFunction(groupId: string): boolean {
		return this.groupBodyFunctions.has(groupId);
	}

	// ========== FIELD SCANNING ==========

	/**
	 * Scan a static group to discover all its fields
	 * Executes the group body in scanning mode to find all fields
	 */
	async scanGroupFields(
		groupId: string,
		body: () => Promise<any>
	): Promise<DiscoveredField[]> {
		this.isScanning = true;

		debugLogger.log("DISCOVERY_START", {
			groupId,
			groupStack: this.state.getGroupHierarchy(),
		});

		// Push group to stack temporarily for discovery
		this.state.enterGroup(groupId);

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
			this.state.exitGroup();
		}

		this.isScanning = false;

		const discoveredFields = this.discoveredFieldsByGroup.get(groupId);
		debugLogger.log("DISCOVERY_END", {
			groupId,
			fields: discoveredFields,
		});

		return discoveredFields || [];
	}

	/**
	 * Re-scan a static group's fields
	 * Used when a group needs to be re-rendered with updated fields
	 */
	async rescanGroupFields(
		groupId: string
	): Promise<DiscoveredField[] | undefined> {
		if (this.isScanning) {
			// Already scanning, skip
			return this.discoveredFieldsByGroup.get(groupId);
		}

		if (!this.groupBodyFunctions.has(groupId)) {
			// No stored body function, return existing fields
			return this.discoveredFieldsByGroup.get(groupId);
		}

		debugLogger.log("REDISCOVERY_START", { groupId });

		const body = this.groupBodyFunctions.get(groupId)!;

		// Clear existing discovered fields for this group
		this.discoveredFieldsByGroup.delete(groupId);

		this.isScanning = true;
		this.state.enterGroup(groupId);

		try {
			await body();
		} catch (e) {
			debugLogger.log("REDISCOVERY_ERROR", { groupId, error: e });
		} finally {
			this.state.exitGroup();
			this.isScanning = false;
		}

		const rescannedFields = this.discoveredFieldsByGroup.get(groupId);
		debugLogger.log("REDISCOVERY_END", {
			groupId,
			fields: rescannedFields,
		});

		return rescannedFields;
	}

	// ========== CLEANUP ==========

	/**
	 * Clear all discovered fields and stored body functions
	 * Typically used when resetting the runtime
	 */
	clearAll(): void {
		this.discoveredFieldsByGroup.clear();
		this.groupBodyFunctions.clear();
		this.isScanning = false;
	}

	// ========== DEBUG/INSPECTION ==========

	getDebugInfo() {
		return {
			isScanning: this.isScanning,
			discoveredGroupsCount: this.discoveredFieldsByGroup.size,
			storedBodiesCount: this.groupBodyFunctions.size,
			groups: Array.from(this.discoveredFieldsByGroup.keys()),
		};
	}
}
