/**
 * Removes common leading indentation from text.
 * Works with both template literals and regular strings.
 *
 * @example Template literal usage:
 * ```typescript
 * const content = dedent`
 *   # Welcome
 *   - This is a list item
 * `;
 * // Result: "# Welcome\n- This is a list item"
 * ```
 *
 * @example String usage:
 * ```typescript
 * const content = dedent("  Hello\n  World");
 * // Result: "Hello\nWorld"
 * ```
 */
export function dedent(
	strings: TemplateStringsArray | string,
	...values: any[]
): string {
	// Handle string input
	if (typeof strings === "string") {
		return dedentString(strings);
	}

	// Handle template literal input
	let result = strings[0];
	for (let i = 1; i < strings.length; i++) {
		result += values[i - 1] + strings[i];
	}

	return dedentString(result);
}

/**
 * Internal helper to dedent a string
 */
function dedentString(text: string): string {
	const lines = text.split("\n");

	// Find minimum indentation (excluding empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim() === "") continue;
		const indent = line.match(/^(\s*)/)?.[1].length || 0;
		minIndent = Math.min(minIndent, indent);
	}

	if (minIndent === Infinity) {
		return text;
	}

	// Remove common indentation
	const dedentedLines = lines.map((line) =>
		line.trim() === "" ? line : line.slice(minIndent)
	);

	return dedentedLines.join("\n");
}
