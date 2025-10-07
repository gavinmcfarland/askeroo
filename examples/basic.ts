#!/usr/bin/env node
import { ask, group, text, confirm } from "../src/index.js";
import { multi } from "../src/built-ins/multi/index.js";
import { logResult } from "../src/utils/logging.js";

const flow = async () => {
	return {
		type: await text({ label: "Type" }),
		framework: await text({ label: "Framework" }),
		typescript: await text({ label: "TypeScript" }),
		template: await text({ label: "Template" }),
	};
};

(async () => {
	try {
		const result = await ask(flow);

		logResult(result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
