import React from "react";
import { Text, Box } from "ink";
import { createPrompt } from "../../core/registry.js";
import type { GroupMeta, GroupOpts } from "../../types/index.js";

// Re-export types
export type { GroupMeta, GroupOpts };

/**
 * User-provided options for the group plugin
 */
export interface GroupOptions extends GroupMeta {
	flow?: "progressive" | "phased" | "static";
	enableArrowNavigation?: boolean;
	body: () => Promise<any>;
	depth?: number;
	parentGroup?: string;
	discoveredFields?: Array<{ id: string; label: string; type: string }>;
}

/**
 * Create a group of prompts
 *
 * Groups are container plugins that organize prompts into logical sections.
 * They support different flow types and can be nested.
 *
 * @example Progressive group (default)
 * ```typescript
 * const answers = await group(
 *   async () => {
 *     const name = await text({ label: "Name" });
 *     const email = await text({ label: "Email" });
 *     return { name, email };
 *   },
 *   { label: "User Info" }
 * );
 * ```
 *
 * @example Static group with arrow navigation
 * ```typescript
 * const answers = await group(
 *   async () => {
 *     const name = await text({ label: "Name" });
 *     const email = await text({ label: "Email" });
 *     return { name, email };
 *   },
 *   { label: "User Info", flow: "static", enableArrowNavigation: true }
 * );
 * ```
 */
export const group = (
	(plugin) =>
	(body: () => Promise<any>, opts?: GroupOpts & GroupMeta): Promise<any> =>
		plugin({ ...opts, body })
)(
	createPrompt<GroupOptions, any>({
		type: "group",
		autoSubmit: true,
		isContainer: true,

		component: ({ node, options, events }: any) => {
			const baseIndent = Math.max(0, ((node.depth || 0) - 1) * 3);

			return (
				<Box flexDirection="column">
					{options.label && (
						<Box width={15} marginLeft={baseIndent}>
							<Text>{options.label}</Text>
						</Box>
					)}
					{node.children && (
						<Box
							flexDirection="column"
							gap={1}
							marginLeft={
								options.label ? baseIndent + 3 : baseIndent
							}
						>
							{node.children}
						</Box>
					)}
				</Box>
			);
		},

		execute: async (runtime, opts, body) =>
			await runtime.executeGroupBody(opts, body),

		transform: (opts, context, id) => ({
			...opts,
			groupName: context.currentGroup,
		}),
	})
);
