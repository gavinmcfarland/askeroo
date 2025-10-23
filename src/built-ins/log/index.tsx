import React, { useEffect } from "react";
import { createPrompt } from "../../core/registry.js";
import {
	MarkdownString,
	parseMarkdown,
	isMarkdownString,
} from "../../utils/markdown.js";
import { Box, Text } from "ink";

/**
 * Log level types
 */
export type LogLevel = "info" | "warn" | "error" | "success";

/**
 * User-provided options for the log plugin
 */
export interface LogOptions {
	message: string | MarkdownString;
	level?: LogLevel;
	// Built-ins are automatically added via PluginOptionsWithBuiltins:
	// meta?
}

/**
 * Log symbol and color mapping
 */
const LOG_CONFIG = {
	info: { symbol: "●", color: "blue" },
	warn: { symbol: "▲", color: "yellow" },
	error: { symbol: "■", color: "red" },
	success: { symbol: "■", color: "green" },
} as const;

// Internal plugin implementation
const logInternal = createPrompt<LogOptions, void>({
	type: "log",

	component: ({ node, options, events }: any) => {
		const msg = options.message;
		const level = (options.level || "info") as LogLevel;
		const isMarkdown = isMarkdownString(msg);
		const config = LOG_CONFIG[level];

		// Auto-submit when component becomes active
		useEffect(() => {
			if (node.state === "active" && events.onSubmit) {
				// setTimeout is now baked into onSubmit for auto submissions
				events.onSubmit({ type: "auto" });
			}
		}, [node.state, events.onSubmit]);

		return (
			<Box flexDirection="column">
				<Box flexDirection="row" alignItems="flex-start">
					<Text color={config.color}>{config.symbol} </Text>
					<Box flexDirection="column">
						{parseMarkdown(
							isMarkdown ? msg.content : msg || "",
							isMarkdown
								? { ...msg.theme, text: config.color }
								: { text: config.color }
						)}
					</Box>
				</Box>
			</Box>
		);
	},
});

// Public API functions for each log level
export function logInfo(
	message: string | MarkdownString,
	options?: { allowBack?: boolean }
): Promise<void> {
	return logInternal({ message, level: "info", ...options });
}

export function logWarn(
	message: string | MarkdownString,
	options?: { allowBack?: boolean }
): Promise<void> {
	return logInternal({ message, level: "warn", ...options });
}

export function logError(
	message: string | MarkdownString,
	options?: { allowBack?: boolean }
): Promise<void> {
	return logInternal({ message, level: "error", ...options });
}

export function logSuccess(
	message: string | MarkdownString,
	options?: { allowBack?: boolean }
): Promise<void> {
	return logInternal({ message, level: "success", ...options });
}

// Create the main log object with methods
export const log = {
	info: logInfo,
	warn: logWarn,
	error: logError,
	success: logSuccess,
};
