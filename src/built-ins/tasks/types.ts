export interface TaskLabel {
	idle?: string;
	running?: string;
	success?: string;
	error?: string;
}

export type CompleteOn = "children" | "self" | "either";

export interface Task {
	label: string | TaskLabel;
	action?: () => Promise<void>;
	tasks?: Task[];
	concurrent?: boolean;
	continueOnError?: boolean;
	completeOn?: CompleteOn;
	visible?: boolean;
}

export interface TasksOptions {
	tasks: Task[];
	concurrent?: boolean;
}

export type TaskStatus = "idle" | "running" | "success" | "error" | "warning";

export interface TaskState {
	status: TaskStatus;
	error?: string;
	warning?: string;
}
