import React from "react";
import { Text, Box } from "ink";
import { createPrompt } from "../../core/registry.js";
import type { GroupMeta } from "../../types/index.js";

// Group-specific types
export type GroupOpts =
	| {
			flow?: "progressive";
			enableArrowNavigation?: never;
			hideOnCompletion?: boolean;
	  }
	| {
			flow: "phased";
			enableArrowNavigation?: never;
			hideOnCompletion?: boolean;
	  }
	| {
			flow: "static";
			enableArrowNavigation?: boolean;
			hideOnCompletion?: boolean;
	  }
	| {
			flow?: undefined;
			enableArrowNavigation?: never;
			hideOnCompletion?: boolean;
	  };

// Re-export types
export type { GroupMeta };

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
	hideOnCompletion?: boolean;
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
 *
 * @example Group that hides after completion
 * ```typescript
 * const answers = await group(
 *   async () => {
 *     const name = await text({ label: "Name" });
 *     const email = await text({ label: "Email" });
 *     return { name, email };
 *   },
 *   { label: "User Info", hideOnCompletion: true }
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
			// Hide entirely if hideOnCompletion is true and group is completed
			if (options.hideOnCompletion && node.state === "completed") {
				return null;
			}

			return (
				<Box flexDirection="column">
					{options.label && (
						<Box>
							<Text color="green">{options.label}</Text>
						</Box>
					)}

					{/* Show custom completion message for completed phased groups */}
					{node.flow === "phased" && node.state === "completed" && (
						<Box marginLeft={options.label ? 3 : 0}>
							<Text color="blue">Completed</Text>
						</Box>
					)}

					{/* Show children for active groups or non-phased completed groups */}
					{node.children &&
						!(
							node.flow === "phased" && node.state === "completed"
						) && (
							<Box
								flexDirection="column"
								gap={1}
								marginLeft={options.label ? 3 : 0}
							>
								{node.children}
							</Box>
						)}
				</Box>
			);
		},

		execute: async (runtime, opts, body) =>
			await runtime.executeGroupBody(opts, body),

		transform: (opts, context) => ({
			...opts,
			groupName: context.currentGroup,
		}),
	})
);
