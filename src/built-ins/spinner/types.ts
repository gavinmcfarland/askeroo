export interface SpinnerLabel {
	idle?: string;
	running?: string;
	paused?: string;
	stopped?: string;
}

export interface SpinnerOptions {
	label?: string | SpinnerLabel;
	spinnerId?: string;
}

export type SpinnerStatus = "idle" | "running" | "paused" | "stopped";

export interface SpinnerState {
	status: SpinnerStatus;
	currentLabel?: string;
}

export interface SpinnerController {
	start: (text?: string) => Promise<void>;
	pause: (text?: string) => Promise<void>;
	resume: (text?: string) => Promise<void>;
	stop: (text?: string) => Promise<void>;
}
