import { Marked } from "marked";
import chalk from "chalk";
import React, { ReactElement } from "react";
import { Text as InkText, Box } from "ink";

// Markdown string type that can be used in place of regular strings
export type MarkdownString = {
	__isMarkdown: true;
	content: string;
	theme?: {
		heading?: string;
		text?: string;
		code?: string;
		link?: string;
		strong?: string;
		emphasis?: string;
	};
};

// Base function to create a MarkdownString
function createMarkdownString(
	content: string,
	theme?: MarkdownString["theme"]
): MarkdownString {
	return {
		__isMarkdown: true,
		content,
		theme,
	};
}

// Tagged template literal function for md`content`
export function md(
	strings: TemplateStringsArray,
	...values: any[]
): MarkdownString {
	// Combine template strings with interpolated values
	let content = strings[0];
	for (let i = 0; i < values.length; i++) {
		content += String(values[i]) + strings[i + 1];
	}

	return createMarkdownString(content);
}

// Type guard to check if a value is a markdown string
export function isMarkdownString(value: any): value is MarkdownString {
	return value && typeof value === "object" && value.__isMarkdown === true;
}

// Helper function to apply chalk styles to text
function applyChalkStyles(text: string, styles: string): string {
	const styleArray = styles.split(" ").filter((s) => s.length > 0);
	let styledText = text;

	// Apply each style using chalk
	for (const style of styleArray) {
		try {
			// Handle background colors and regular styles
			if (
				(chalk as any)[style] &&
				typeof (chalk as any)[style] === "function"
			) {
				styledText = (chalk as any)[style](styledText);
			}
		} catch (e) {
			// Ignore invalid chalk styles
			console.warn(`Invalid chalk style: ${style}`);
		}
	}

	return styledText;
}

// Chalk token extension for marked
const chalkTokenExtension = {
	name: "chalkToken",
	level: "inline" as const,
	start(src: string) {
		// Find the first occurrence of [text]{styles} pattern
		const match = src.match(/\[([^\]]+)\]\{([^}]+)\}/);
		return match ? match.index : undefined;
	},
	tokenizer(src: string) {
		// Regex to match [text]{style1 style2} pattern from the start
		const rule = /^\[([^\]]+)\]\{([^}]+)\}/;
		const match = rule.exec(src);
		if (match) {
			return {
				type: "chalkToken",
				raw: match[0],
				text: match[1], // The text content
				styles: match[2].trim(), // The chalk styles
			};
		}
	},
	renderer(token: any) {
		// This will be handled in formatInlineTokens instead
		return token.raw;
	},
};

// Utility function to dedent content
function dedentContent(content: string): string {
	// Handle undefined or null content
	if (!content) return "";

	// Split into lines
	const lines = content.split("\n");

	// Find the minimum indentation (excluding empty lines and the first line)
	let minIndent = Infinity;
	for (let i = 1; i < lines.length; i++) {
		// Start from line 1, skip first line
		const line = lines[i];
		if (line.trim() === "") continue; // Skip empty lines
		const indent = line.match(/^(\s*)/)?.[1].length || 0;
		minIndent = Math.min(minIndent, indent);
	}

	// If no indentation found, return as is
	if (minIndent === Infinity) {
		return content;
	}

	// Remove the common indentation from all lines
	const dedentedLines = lines.map((line, index) => {
		if (line.trim() === "") return line; // Keep empty lines as is
		if (index === 0) return line; // Keep first line as is
		return line.slice(minIndent);
	});

	return dedentedLines.join("\n");
}

// Format inline tokens from marked
function formatInlineTokens(tokens: any[], theme: any): ReactElement[] {
	const elements: ReactElement[] = [];
	let key = 0;

	for (const token of tokens) {
		switch (token.type) {
			case "paragraph":
				// Handle nested paragraph tokens (like in blockquotes and list items)
				const paragraphElements = formatInlineTokens(
					token.tokens || [],
					theme
				);
				elements.push(...paragraphElements);
				break;

			case "text":
				if (token.tokens && token.tokens.length > 0) {
					// Text token with nested tokens (like in list items)
					const nestedElements = formatInlineTokens(
						token.tokens,
						theme
					);
					elements.push(...nestedElements);
				} else {
					// Simple text token
					elements.push(
						<InkText key={key++} color={theme.text}>
							{token.text}
						</InkText>
					);
				}
				break;

			case "code":
			case "codespan":
				elements.push(
					<InkText key={key++} color={theme.code}>
						{token.text}
					</InkText>
				);
				break;

			case "strong":
				const strongText = token.tokens
					? formatInlineTokens(token.tokens, theme)
					: token.text;
				elements.push(
					<InkText key={key++} color={theme.text} bold>
						{strongText}
					</InkText>
				);
				break;

			case "em":
				const emphasisText = token.tokens
					? formatInlineTokens(token.tokens, theme)
					: token.text;
				elements.push(
					<InkText key={key++} color={theme.text} italic>
						{emphasisText}
					</InkText>
				);
				break;

			case "link":
				// Extract plain text from link token
				const linkText = token.text || "";
				const linkUrl = (token as any).href || "";
				// Show link text with URL in parentheses for CLI compatibility
				// But only show URL in parentheses if the link text is different from the URL
				const displayText =
					linkText === linkUrl
						? linkText
						: `${linkText} (${linkUrl})`;
				elements.push(
					<InkText key={key++} color={theme.link} underline>
						{displayText}
					</InkText>
				);
				break;

			case "chalkToken":
				// Apply chalk styles to the text
				const styledText = applyChalkStyles(token.text, token.styles);
				elements.push(<InkText key={key++}>{styledText}</InkText>);
				break;

			default:
				// For any unhandled inline token types, try to get text content
				const text = (token as any).text || "";
				if (text) {
					elements.push(
						<InkText key={key++} color={theme.text}>
							{text}
						</InkText>
					);
				}
				break;
		}
	}

	return elements;
}

// Create a custom marked instance with chalk token extension
const customMarked = new Marked({
	extensions: [chalkTokenExtension],
});

// Parse markdown content into React elements
export function parseMarkdown(
	content: string,
	theme: MarkdownString["theme"] = {}
): ReactElement[] {
	const defaultTheme = {
		heading: "cyan",
		text: "white",
		code: "cyan",
		link: "blue",
		strong: "bold",
		emphasis: "italic",
		...theme,
	};

	// Automatically dedent the content
	const dedentedContent = dedentContent(content || "");

	// Parse markdown into tokens using custom marked instance
	const tokens = customMarked.lexer(dedentedContent);
	const elements: ReactElement[] = [];
	let key = 0;

	// Process tokens
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		const nextToken = tokens[i + 1];

		switch (token.type) {
			case "heading":
				const level = token.depth || 1;
				const headingText = token.text;

				if (level === 1) {
					elements.push(
						<InkText key={key++} color={defaultTheme.heading} bold>
							{headingText}
						</InkText>
					);
				} else if (level === 2) {
					elements.push(
						<InkText key={key++} color="blue" bold>
							{headingText}
						</InkText>
					);
				} else if (level === 3) {
					elements.push(
						<InkText key={key++} bold>
							{headingText}
						</InkText>
					);
				} else {
					// H4: Bullet point style with dots
					elements.push(
						<InkText key={key++} dimColor bold>
							{headingText}
						</InkText>
					);
				}

				// Add spacing after heading if next token is not a space and not the last token
				if (
					nextToken &&
					nextToken.type !== "space" &&
					nextToken.type !== "heading"
				) {
					elements.push(<Box key={key++} height={1} />);
				}
				break;

			case "code":
				const codeText = token.text;
				if (token.lang) {
					// Fenced code block
					elements.push(
						<Box
							key={key++}
							marginLeft={2}
							borderStyle="round"
							borderColor="gray"
						>
							<InkText color={defaultTheme.code}>
								{codeText}
							</InkText>
						</Box>
					);
				} else {
					// Inline code
					elements.push(
						<InkText
							key={key++}
							color={defaultTheme.code}
							backgroundColor="gray"
						>
							{codeText}
						</InkText>
					);
				}
				break;

			case "list":
				const listItems = token.items || [];
				listItems.forEach((item: any, index: number) => {
					let marker: string;
					if (token.ordered) {
						// Use the actual item number for ordered lists
						marker = `${index + 1}.`;
					} else {
						// Use bullet point for unordered lists
						marker = "•";
					}
					// Process the tokens within the list item
					const itemTokens = item.tokens || [];
					const formattedItem = formatInlineTokens(
						itemTokens,
						defaultTheme
					);
					elements.push(
						<Box key={key++} marginLeft={2}>
							<InkText color={defaultTheme.text}>
								{marker}{" "}
							</InkText>
							{formattedItem}
						</Box>
					);
				});
				break;

			case "blockquote":
				// Process the paragraph tokens within the blockquote
				const paragraphTokens = token.tokens || [];
				const formattedQuote = formatInlineTokens(
					paragraphTokens,
					defaultTheme
				);
				elements.push(
					<Box key={key++}>
						<InkText color={defaultTheme.text}>{"> "}</InkText>
						{formattedQuote}
					</Box>
				);
				break;

			case "paragraph":
				const formattedText = formatInlineTokens(
					token.tokens || [],
					defaultTheme
				);
				elements.push(<Box key={key++}>{formattedText}</Box>);
				break;

			case "space":
				elements.push(<Box key={key++} height={1} />);
				break;

			default:
				// For any unhandled token types, try to get text content
				const text = (token as any).text || "";
				if (text.trim()) {
					elements.push(
						<InkText key={key++} color={defaultTheme.text}>
							{text}
						</InkText>
					);
				}
				break;
		}
	}

	return elements;
}
