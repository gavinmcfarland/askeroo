import { ask, note, stream } from "./src/index.js";

async function simulateNpmInstall() {
	const output = await stream({
		maxLines: 15,
		showLineNumbers: false,
	});

	const packages = ["lodash@4.17.21", "axios@1.5.0", "chalk@5.3.0"];

	await output.writeLine("npm WARN deprecated inflight@1.0.6");
	for (const pkg of packages) {
		await output.writeLine(`added ${pkg}`);
		await new Promise((r) => setTimeout(r, 100));
	}
	await output.writeLine(`added ${packages.length} packages in 1s`);
	// NOT calling complete() - should still work!
}

async function streamWithLineNumbers() {
	const output = await stream("Server logs", {
		maxLines: 5,
		showLineNumbers: true,
		prefixSymbol: "▸",
	});

	for (let i = 1; i <= 10; i++) {
		await output.writeLine(`Request ${i} processed`);
		await new Promise((r) => setTimeout(r, 100));
	}

	await output.complete("Server stopped");
}

const flow = async () => {
	await note("[Test]{dim}");
	await simulateNpmInstall();

	await note("Between streams");
	await streamWithLineNumbers();

	console.log("\n✓ Test complete - both streams should be visible above!");
};

(async () => {
	try {
		await ask(flow);
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
})();
