/**
 * Removes common leading indentation from a template literal string.
 * This is useful for markdown content where you want to maintain proper indentation
 * in your code but remove it from the actual content.
 *
 * @param strings - Template literal strings
 * @param values - Interpolated values
 * @returns Dedented string
 *
 * @example
 * ```typescript
 * const content = dedent`
 *   # Welcome
 *   - This is a list item
 *   - Another item
 * `;
 * // Result: "# Welcome\n- This is a list item\n- Another item"
 * ```
 */
export function dedent(
	strings: TemplateStringsArray,
	...values: any[]
): string {
	// Join the template literal parts
	let result = strings[0];
	for (let i = 1; i < strings.length; i++) {
		result += values[i - 1] + strings[i];
	}

	// Split into lines
	const lines = result.split("\n");

	// Find the minimum indentation (excluding empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim() === "") continue; // Skip empty lines
		const indent = line.match(/^(\s*)/)?.[1].length || 0;
		minIndent = Math.min(minIndent, indent);
	}

	// If no indentation found, return as is
	if (minIndent === Infinity) {
		return result;
	}

	// Remove the common indentation from all lines
	const dedentedLines = lines.map((line) => {
		if (line.trim() === "") return line; // Keep empty lines as is
		return line.slice(minIndent);
	});

	return dedentedLines.join("\n");
}

/**
 * Alternative function that works with regular strings (not template literals)
 *
 * @param text - The text to dedent
 * @returns Dedented string
 *
 * @example
 * ```typescript
 * const content = dedentString(`
 *   # Welcome
 *   - This is a list item
 * `);
 * ```
 */
export function dedentString(text: string): string {
	// Split into lines
	const lines = text.split("\n");

	// Find the minimum indentation (excluding empty lines)
	let minIndent = Infinity;
	for (const line of lines) {
		if (line.trim() === "") continue; // Skip empty lines
		const indent = line.match(/^(\s*)/)?.[1].length || 0;
		minIndent = Math.min(minIndent, indent);
	}

	// If no indentation found, return as is
	if (minIndent === Infinity) {
		return text;
	}

	// Remove the common indentation from all lines
	const dedentedLines = lines.map((line) => {
		if (line.trim() === "") return line; // Keep empty lines as is
		return line.slice(minIndent);
	});

	return dedentedLines.join("\n");
}
