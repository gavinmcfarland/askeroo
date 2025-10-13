export interface SpinnerLabel {
	idle?: string;
	running?: string;
	paused?: string;
	stopped?: string;
}

export interface SpinnerSymbol {
	idle?: string;
	running?: string | string[];
	paused?: string;
	stopped?: string;
}

export interface SpinnerStyle {
	color?: string;
	bgColor?: string;
	dim?: boolean;
	symbol?: string | SpinnerSymbol;
}

export interface SpinnerOptions {
	label?: string | SpinnerLabel;
	spinnerId?: string;
	color?: string;
	bgColor?: string;
	dim?: boolean;
	hideOnCompletion?: boolean;
	submitDelay?: number;
	symbol?: string | SpinnerSymbol;
}

export type SpinnerStatus = "idle" | "running" | "paused" | "stopped";

export interface SpinnerState {
	status: SpinnerStatus;
	currentLabel?: string;
	currentStyle?: SpinnerStyle;
	gracePeriodActive?: boolean;
	currentSymbol?: string | SpinnerSymbol;
}

export interface SpinnerController {
	start: (text?: string, style?: SpinnerStyle) => Promise<void>;
	pause: (text?: string, style?: SpinnerStyle) => Promise<void>;
	resume: (text?: string, style?: SpinnerStyle) => Promise<void>;
	stop: (text?: string, style?: SpinnerStyle) => Promise<void>;
}
