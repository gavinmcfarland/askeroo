import { writeFileSync, appendFileSync } from "fs";
import { join } from "path";

interface DebugEvent {
	timestamp: number;
	event: string;
	data?: any;
	stackTrace: string;
}

class DebugLogger {
	private isEnabled: boolean = false;
	private logFile: string = "";
	private events: DebugEvent[] = [];
	private hasCleanedUp: boolean = false;
	private signalHandlersSetup: boolean = false;
	private signalHandlers: Array<{
		event: string;
		handler: (...args: any[]) => void;
	}> = [];

	constructor() {
		this.isEnabled = process.argv.includes("--debug");
		if (this.isEnabled) {
			this.logFile = join(process.cwd(), `debug-${Date.now()}.log`);
			this.initLogFile();
			this.setupSignalHandlers();

			// Increase max listeners to prevent warnings during development
			process.setMaxListeners(20);
		}
	}

	private setupSignalHandlers(): void {
		// Prevent duplicate signal handler setup
		if (this.signalHandlersSetup) {
			return;
		}

		this.signalHandlersSetup = true;

		// Set up signal handlers immediately when debug is enabled
		const handleExit = () => {
			this.cleanup();
			process.exit(0);
		};

		const handleExitSync = () => {
			if (!this.hasCleanedUp) {
				// Force console output on exit
				process.stdout.write(
					"\n🐛 Debug log saved to: " + this.logFile + "\n"
				);
			}
		};

		const handleUncaughtException = (error: Error) => {
			this.log("UNCAUGHT_EXCEPTION", {
				error: error.message,
				stack: error.stack,
			});
			this.cleanup();
			process.exit(1);
		};

		const handleUnhandledRejection = (reason: any) => {
			this.log("UNHANDLED_REJECTION", { reason });
			this.cleanup();
			process.exit(1);
		};

		// Store handler references for proper cleanup
		this.signalHandlers = [
			{ event: "SIGINT", handler: handleExit },
			{ event: "SIGTERM", handler: handleExit },
			{ event: "exit", handler: handleExitSync },
			{ event: "uncaughtException", handler: handleUncaughtException },
			{ event: "unhandledRejection", handler: handleUnhandledRejection },
		];

		// Add all handlers
		this.signalHandlers.forEach(({ event, handler }) => {
			process.on(event, handler);
		});
	}

	private initLogFile(): void {
		const header = `Debug Log - ${new Date().toISOString()}\n${"=".repeat(
			50
		)}\n\n`;
		writeFileSync(this.logFile, header);
		this.log("DEBUG_INIT", "Debug logging initialized");
	}

	private captureStackTrace(): string {
		const stack = new Error().stack || "";
		return stack
			.split("\n")
			.slice(3) // Remove the first 3 lines (Error message + this function + log function)
			.map((line) => line.trim())
			.join("\n");
	}

	log(event: string, data?: any): void {
		if (!this.isEnabled) return;

		const debugEvent: DebugEvent = {
			timestamp: Date.now(),
			event,
			data,
			stackTrace: this.captureStackTrace(),
		};

		this.events.push(debugEvent);

		const logEntry = this.formatLogEntry(debugEvent);
		appendFileSync(this.logFile, logEntry + "\n\n");
	}

	private formatLogEntry(event: DebugEvent): string {
		const timestamp = new Date(event.timestamp).toISOString();
		let entry = `[${timestamp}] ${event.event}`;

		if (event.data !== undefined) {
			entry += `\nData: ${JSON.stringify(event.data, null, 2)}`;
		}

		entry += `\nStack Trace:\n${event.stackTrace}`;
		entry += `\n${"-".repeat(40)}`;

		return entry;
	}

	getLogFile(): string {
		return this.logFile;
	}

	isDebugEnabled(): boolean {
		return this.isEnabled;
	}

	hasPerformedCleanup(): boolean {
		return this.hasCleanedUp;
	}

	cleanup(): void {
		if (!this.isEnabled || this.hasCleanedUp) return;

		this.hasCleanedUp = true;
		this.log("DEBUG_CLEANUP", "Debug session ended");
		console.log("\n🐛 Debug log saved to:", this.logFile);

		// Remove event listeners to prevent memory leaks
		this.removeSignalHandlers();
	}

	private removeSignalHandlers(): void {
		if (!this.signalHandlersSetup) return;

		// Remove specific listeners using stored references
		this.signalHandlers.forEach(({ event, handler }) => {
			process.off(event, handler);
		});

		// Clear the handlers array
		this.signalHandlers = [];
		this.signalHandlersSetup = false;

		// Reset max listeners to default to prevent interference
		if (process.setMaxListeners) {
			process.setMaxListeners(10);
		}
	}
}

// Ensure singleton pattern - only create one instance
let debugLoggerInstance: DebugLogger | null = null;

export function getDebugLogger(): DebugLogger {
	if (!debugLoggerInstance) {
		debugLoggerInstance = new DebugLogger();
	}
	return debugLoggerInstance;
}

// Export the singleton instance for backward compatibility
// Use a getter function to ensure we always get the same instance
export const debugLogger = new Proxy({} as DebugLogger, {
	get(target, prop) {
		return getDebugLogger()[prop as keyof DebugLogger];
	},
});
