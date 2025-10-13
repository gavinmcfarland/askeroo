#!/usr/bin/env node
import { ask, note, spinner } from "../src/index.js";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const flow = async () => {
	const job = await spinner("Loading data");

	await sleep(3000);
	job.start();

	await sleep(3000);
	job.pause();

	await sleep(3000);
	job.resume();

	await sleep(3000);
	await job.stop();

	return "Done!";
};

(async () => {
	try {
		const result = await ask(flow);
		console.log(result);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
