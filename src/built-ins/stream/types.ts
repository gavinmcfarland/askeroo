export interface StreamOptions {
	label?: string;
	maxLines?: number; // Maximum lines to display (older lines scroll off)
	streamId?: string;
	hideOnCompletion?: boolean;
	submitDelay?: number;
	showLineNumbers?: boolean;
	prefixSymbol?: string; // Symbol to show before each line
	autoComplete?: boolean; // Auto-complete immediately to avoid blocking runtime
}

export type StreamStatus = "active" | "completed" | "error";

export interface StreamState {
	status: StreamStatus;
	lines: string[];
	label?: string;
}

export interface StreamController {
	write: (text: string) => Promise<void>;
	writeLine: (text: string) => Promise<void>;
	clear: () => Promise<void>;
	setLabel: (label: string) => Promise<void>;
	complete: (finalMessage?: string) => Promise<void>;
	error: (errorMessage?: string) => Promise<void>;
}
