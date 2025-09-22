#!/usr/bin/env node

import { ask, group, text, confirm } from "./index.js";
import { debugLogger } from "./debug.js";

const flow = async () => {
	debugLogger.log('FLOW_FUNCTION_START');

	let test = await text({ message: "Test" });
	debugLogger.log('TEXT_PROMPT_COMPLETE', { field: 'test', value: test });

	let test2 = await text({ message: "Test2" });
	debugLogger.log('TEXT_PROMPT_COMPLETE', { field: 'test2', value: test2 });

	// Group 1: Profile (sequential by default)
	debugLogger.log('GROUP_START', { groupName: 'Profile' });
	const profile = await group(
		{ message: "Profile", flow: "phase" },
		async () => {
			const first = await text({ message: "First name" });
			debugLogger.log('TEXT_PROMPT_COMPLETE', { field: 'first', value: first });
			const middle = await text({ message: "Middle name" });
			debugLogger.log('TEXT_PROMPT_COMPLETE', { field: 'middle', value: middle });
			const last = await text({ message: "Last name" });
			debugLogger.log('TEXT_PROMPT_COMPLETE', { field: 'last', value: last });
			return { first, middle, last };
		}
	);
	debugLogger.log('GROUP_COMPLETE', { groupName: 'Profile', result: profile });

	// Group 2: Preferences (explicit phase behavior)
	const prefs = await group({ message: "Preferences" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			const email = await text({ message: "Email" });
			return { role, code, email };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});

	const prefs2 = await group({ message: "What" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});
	debugLogger.log('GROUP_COMPLETE', { groupName: 'What', result: prefs2 });

	const prefs3 = await group({ message: "Yoopooo" }, async () => {
		const role = await text({ message: "Role (user/admin)" });
		if (role === "admin") {
			const code = await text({ message: "Access code" });
			return { role, code };
		}
		const news = await confirm({ message: "Subscribe to newsletter?" });
		return { role, news };
	});
	debugLogger.log('GROUP_COMPLETE', { groupName: 'Yoopooo', result: prefs3 });

	debugLogger.log('FLOW_FUNCTION_END', { profile, prefs });
	return { profile, prefs };
};

(async () => {
	try {
		debugLogger.log('MAIN_START');

		if (debugLogger.isDebugEnabled()) {
			console.log('🐛 Debug logging enabled. Stack traces will be written to:', debugLogger.getLogFile());
		}

		const result = await ask(flow);
		debugLogger.log('MAIN_COMPLETE', { result });

		console.log("\nResult:", JSON.stringify(result, null, 2));
	} catch (error) {
		const errorInfo = error instanceof Error
			? { error: error.message, stack: error.stack }
			: { error: String(error), stack: 'No stack trace available' };
		debugLogger.log('MAIN_ERROR', errorInfo);
		debugLogger.cleanup();
		console.error("Error:", error);
		process.exit(1);
	}
})();
