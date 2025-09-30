import { useEffect } from "react";

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