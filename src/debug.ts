/**
 * Simple debug logger for development
 * Enable with --debug flag
 */
class DebugLogger {
	private isEnabled: boolean = false;
	private startTime: number = Date.now();

	constructor() {
		this.isEnabled = process.argv.includes("--debug");
		if (this.isEnabled) {
			console.log("🐛 Debug mode enabled");
		}
	}

	log(event: string, data?: any): void {
		if (!this.isEnabled) return;

		const elapsed = Date.now() - this.startTime;
		const timestamp = `+${elapsed}ms`;

		if (data !== undefined) {
			console.log(`[${timestamp}] ${event}:`, data);
		} else {
			console.log(`[${timestamp}] ${event}`);
		}
	}

	isDebugEnabled(): boolean {
		return this.isEnabled;
	}

	cleanup(): void {
		if (this.isEnabled) {
			console.log("🐛 Debug session ended");
		}
	}
}

// Singleton instance
let debugLoggerInstance: DebugLogger | null = null;

export function getDebugLogger(): DebugLogger {
	if (!debugLoggerInstance) {
		debugLoggerInstance = new DebugLogger();
	}
	return debugLoggerInstance;
}

// Export singleton with proxy for backward compatibility
export const debugLogger = new Proxy({} as DebugLogger, {
	get(target, prop) {
		return getDebugLogger()[prop as keyof DebugLogger];
	},
});
