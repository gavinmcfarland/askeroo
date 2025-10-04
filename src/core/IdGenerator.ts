/**
 * IdGenerator - Handles generation of stable, deterministic IDs for prompts and groups
 *
 * This class encapsulates all ID generation logic, making it easier to test and maintain.
 * IDs are generated based on the context (type, message, group stack, etc.) to ensure
 * that the same prompt in the same context always gets the same ID.
 */

export interface FieldIdContext {
	kind: string; // 'text', 'confirm', etc.
	message?: string;
	groupStack: string[];
	stepIndex?: number;
	customId?: string;
}

export interface GroupIdContext {
	groupStack: string[];
	groupCount: number;
	flowType?: string;
	customId?: string;
}

export class IdGenerator {
	private groupCounter = 0;

	/**
	 * Generate a stable ID for a field (prompt)
	 */
	generateFieldId(context: FieldIdContext): string {
		// Use custom ID if provided
		if (context.customId) {
			return context.customId;
		}

		// Field ID: kind + group + step + message hash
		const parts: string[] = [context.kind];

		if (context.groupStack.length > 0) {
			parts.push(
				`g:${context.groupStack[context.groupStack.length - 1]}`
			);
		}

		parts.push(`s:${context.stepIndex || 0}`);

		if (context.message) {
			parts.push(`m:${this.simpleHash(context.message)}`);
		}

		return parts.join("|");
	}

	/**
	 * Generate a stable ID for a group
	 */
	generateGroupId(context: GroupIdContext): string {
		// Use custom ID if provided
		if (context.customId) {
			return context.customId;
		}

		// Group ID: depth + index + flow
		const depth = context.groupStack.length;
		const index = context.groupCount;
		const flow = context.flowType || "sequential";

		return `group_${depth}_${index}_${flow}`;
	}

	/**
	 * Increment and return the current group count
	 * This is used to generate unique group IDs
	 */
	incrementGroupCount(): number {
		this.groupCounter++;
		return this.groupCounter;
	}

	/**
	 * Get the current group count without incrementing
	 */
	getGroupCount(): number {
		return this.groupCounter;
	}

	/**
	 * Reset the group counter
	 * Called when starting a new flow or replay
	 */
	reset(): void {
		this.groupCounter = 0;
	}

	/**
	 * Simple hash function for generating short, stable hashes from strings
	 * @private
	 */
	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0x7fffffff;
		}
		return hash.toString(36);
	}
}
