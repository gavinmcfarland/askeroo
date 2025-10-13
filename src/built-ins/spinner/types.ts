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
}

export interface SpinnerController {
	start: () => void;
	pause: () => void;
	resume: () => void;
	stop: () => Promise<void>;
}
