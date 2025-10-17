import { ask, note, stream } from "./src/index.js";

async function testStream() {
	const output = await stream("Test stream", {
		maxLines: 10,
		showLineNumbers: true,
	});

	console.log("Stream initialized");

	for (let i = 1; i <= 5; i++) {
		console.log(`Writing line ${i}`);
		await output.writeLine(`Line ${i}`);
		await new Promise((r) => setTimeout(r, 200));
	}

	console.log("About to complete stream");
	await output.complete("Done");
	console.log("Stream completed");
}

const flow = async () => {
	console.log("=== Starting flow ===");

	console.log("About to show note");
	await note("First note");
	console.log("Note completed");

	console.log("About to start stream");
	await testStream();
	console.log("Test complete");
};

(async () => {
	try {
		await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
