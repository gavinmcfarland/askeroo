import { ask } from "./src/index.js";

async function main() {
	console.log("\n🧪 Testing TextInput cursor-based clearing:");
	console.log("  • Ctrl+U: Clear from beginning to cursor");
	console.log("  • Ctrl+K: Clear from cursor to end");
	console.log("  • Ctrl+A: Jump to start");
	console.log("  • Ctrl+E: Jump to end\n");

	const name = await ask.text({
		label: "Type some text, move cursor, then try Ctrl+U or Ctrl+K",
		initialValue: "Hello World!",
	});

	console.log(`\nYou entered: "${name}"`);
}

main();
