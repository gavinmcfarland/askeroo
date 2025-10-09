import { ask, text } from "../dist/src/index.js";

async function testOnCancel() {
	console.log("✓ Testing onCancel registration...");

	let callbackRegistered = false;
	let callbackCalled = false;

	// Test that onCancel is available
	try {
		await ask(async ({ onCancel }) => {
			// Test that onCancel is a function
			if (typeof onCancel !== "function") {
				throw new Error("onCancel is not a function");
			}

			// Register a callback
			onCancel(() => {
				callbackCalled = true;
			});

			callbackRegistered = true;

			// Complete the flow immediately
			return { test: "complete" };
		});

		console.log("✅ onCancel is available as a function parameter");
		console.log("✅ Callback can be registered successfully");
		console.log("✅ Test passed!");
		process.exit(0);
	} catch (error) {
		console.error("❌ Test failed:", error);
		process.exit(1);
	}
}

testOnCancel();
