import { useEffect } from "react";
import { PluginState } from "../types/index.js";

export interface AutoSubmitProps {
	onSubmit?: (value: any) => void;
	state?: PluginState;
}

/**
 * Hook for non-interactive plugins that need to auto-submit
 * without requiring user interaction.
 *
 * @param onSubmit - The submit callback to trigger
 * @param state - The current plugin state
 * @param delay - Optional delay in milliseconds before submitting (default: 100ms)
 */
export function useAutoSubmit(
	onSubmit: AutoSubmitProps["onSubmit"],
	state: AutoSubmitProps["state"] = "active",
	delay: number = 100
) {
	useEffect(() => {
		if (onSubmit && state === "active") {
			const timer = setTimeout(onSubmit, delay);
			return () => clearTimeout(timer);
		}
	}, [onSubmit, state, delay]);
}

/**
 * Common hook for resetting field submitted state when field becomes active again
 */
export const useFieldReset = (
	disabled: boolean,
	submitted: boolean,
	setSubmitted: (value: boolean) => void
) => {
	useEffect(() => {
		if (!disabled && submitted) {
			setSubmitted(false);
		}
	}, [disabled, submitted, setSubmitted]);
};
