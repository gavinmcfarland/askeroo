import { useEffect } from "react";

export interface AutoSubmitProps {
	onSubmit?: (value: any) => void;
	completed?: boolean;
	disabled?: boolean;
}

/**
 * Hook for non-interactive plugins that need to auto-submit
 * without requiring user interaction.
 *
 * @param onSubmit - The submit callback to trigger
 * @param completed - Whether the field is already completed
 * @param disabled - Whether the field is disabled
 * @param delay - Optional delay in milliseconds before submitting (default: 100ms)
 */
export function useAutoSubmit(
	onSubmit: AutoSubmitProps["onSubmit"],
	completed: AutoSubmitProps["completed"],
	disabled: AutoSubmitProps["disabled"],
	delay: number = 100
) {
	useEffect(() => {
		if (onSubmit && !completed && !disabled) {
			const timer = setTimeout(onSubmit, delay);
			return () => clearTimeout(timer);
		}
	}, [onSubmit, completed, disabled, delay]);
}
